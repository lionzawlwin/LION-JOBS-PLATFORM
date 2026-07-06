import { z } from 'zod';
import { appendCandidate, updateCandidateCvUrl, saveAiScore } from '@/lib/db';
import { createCandidateFolder, uploadFileToDrive } from '@/lib/drive';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';
import { scoreCandidateAgainstJob, extractTextFromBase64 } from '@/lib/ai/cvAnalyzer';
import { getJobs } from '@/lib/db';
import { logFailure, logRateLimitHit } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// 5 submissions per IP per 10 minutes — generous for real applicants,
// blocks scripted floods.
const RATE_LIMIT_WINDOW_S = 600;
const RATE_LIMIT_MAX      = 5;

const applySchema = z
  .object({
    fullName:        z.string().min(2),
    email:           z.string().email().optional(),
    phone:           z.string().min(7),
    position:        z.string().min(2),
    jobId:           z.string().optional(),
    mode:            z.enum(['cv', 'linkedin']),
    // base64 of a 5 MB file ≈ 6.7 M chars; 7 M gives comfortable headroom
    cvBase64:        z.string().max(7_000_000, 'CV file must be 5 MB or smaller.').optional(),
    cvFileName:      z.string().max(255).optional(),
    linkedinUrl:     z.string().url().optional(),
    expectedSalary:  z.string().optional(),
    desiredCategory: z.string().optional(),
    // extended profile fields (v3)
    noticePeriod:    z.string().optional(),
    cityLocation:    z.string().optional(),
    education:       z.string().optional(),
    experienceYears: z.string().optional(),
    currentCompany:  z.string().optional(),
    currentSalary:   z.string().optional(),
    languages:       z.string().optional(),
    skills:          z.string().optional(),
    portfolioUrl:    z.string().optional(),
  })
  .refine(
    (d) =>
      d.mode === 'cv'
        ? Boolean(d.cvBase64 && d.cvFileName)
        : Boolean(d.linkedinUrl),
    { message: 'Provide either a CV or a LinkedIn URL.' },
  );

export async function POST(req: NextRequest) {
  // ── Rate limit: 5 applications per IP per 10 minutes ─────────────
  const ip  = getClientIp(req);
  const rl  = await checkRateLimit(`apply:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!rl.allowed) {
    await logRateLimitHit('/api/apply');
    return Response.json(
      { error: 'Too many submissions. Please wait a few minutes and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(rl.resetIn),
          'X-RateLimit-Limit':     String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.floor(Date.now() / 1000) + rl.resetIn),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    return Response.json({ error: message }, { status: 422 });
  }

  const {
    fullName, email, phone, position, jobId, cvBase64, cvFileName, linkedinUrl,
    expectedSalary, desiredCategory,
    noticePeriod, cityLocation, education, experienceYears,
    currentCompany, currentSalary, languages, skills, portfolioUrl,
  } = parsed.data;

  const candidateNotes = desiredCategory ? `Category: ${desiredCategory}` : undefined;

  // ── 1. Write directly to database ────────────────────────────────
  let applicationId: string | undefined;
  try {
    applicationId = await appendCandidate({
      fullName, email, phone, position, jobId, linkedinUrl, cvFileName,
      expectedSalary, notes: candidateNotes,
      noticePeriod, cityLocation, education, experienceYears,
      currentCompany, currentSalary, languages, skills, portfolioUrl,
    });
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/apply',
      message:  'CRITICAL — database insert failed',
      error:    err,
      context:  { hasJobId: Boolean(jobId) },
    });
    return Response.json(
      { error: 'Could not save your application. Please try again or contact us directly.' },
      { status: 502 },
    );
  }

  // ── 2. Upload CV directly to Google Drive ─────────────────────────
  // Non-critical: if Drive upload fails the application is already saved.
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (parentFolderId && cvBase64 && cvFileName) {
    (async () => {
      try {
        // a. Create a sub-folder named after the candidate
        const folderId = await createCandidateFolder(fullName, parentFolderId);

        // b. Upload the CV file into that folder
        const driveUrl = await uploadFileToDrive(
          { name: cvFileName, base64: cvBase64 },
          folderId,
        );

        // c. Write the Drive URL back into the application record
        if (applicationId) {
          await updateCandidateCvUrl(applicationId, driveUrl);
        }
      } catch (err) {
        // Non-fatal — database row already exists
        await logFailure({
          category: 'other',
          route:    '/api/apply',
          message:  'Drive upload error (non-critical — DB write succeeded)',
          error:    err,
          context:  { applicationId: applicationId ?? null },
        });
      }
    })();
  }

  // ── 3. AI scoring (background, non-blocking) ─────────────────────
  // Fire-and-forget: client already received { ok: true } above.
  if (applicationId) {
    (async () => {
      try {
        // Attempt PDF text extraction if a CV file was uploaded
        let cvText: string | undefined;
        if (cvBase64 && cvFileName) {
          const mimeType = cvFileName.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'text/plain';
          const extracted = await extractTextFromBase64(cvBase64, mimeType);
          if (extracted) cvText = extracted;
        }

        // Find the job to score against
        const jobs = await getJobs();
        const job = jobId ? jobs.find((j) => j.id === jobId) : null;

        const result = await scoreCandidateAgainstJob(
          {
            name:            fullName,
            position,
            experienceYears,
            education,
            skills,
            currentCompany,
            languages,
            cityLocation,
            linkedinUrl,
          },
          job
            ? {
                title:        job.title,
                description:  job.description,
                requirements: job.requirements,
                category:     job.category,
                type:         job.type,
              }
            : {
                title:        position,
                description:  '',
                requirements: [],
              },
          cvText,
        );

        if (result) {
          await saveAiScore(applicationId, result.score, result.summary, result.reasoning);
        }
      } catch (err) {
        await logFailure({
          category: 'ai_scoring',
          route:    '/api/apply',
          message:  'AI scoring error (non-critical)',
          error:    err,
          context:  { applicationId: applicationId ?? null },
        });
      }
    })();
  }

  return Response.json({ ok: true, confirmationSent: Boolean(email) });
}
