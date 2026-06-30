import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getCandidates, saveAiScore } from '@/lib/db';
import { getJobs } from '@/lib/db';
import { scoreCandidateAgainstJob } from '@/lib/ai/cvAnalyzer';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'lionzawlwin@gmail.com';

/**
 * POST /api/analyze-cv
 * Body: { applicationId: string } — re-run AI scoring for one application
 *       { all: true }             — batch-process all unscored applications
 *
 * Auth: admin only
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const all  = body.all === true;
  const targetId = typeof body.applicationId === 'string' ? body.applicationId : null;

  if (!all && !targetId) {
    return Response.json({ error: 'Provide applicationId or all:true' }, { status: 400 });
  }

  const [candidates, jobs] = await Promise.all([getCandidates(), getJobs()]);

  const targets = all
    ? candidates.filter((c) => !c.matchScore || c.matchScore === 0)
    : candidates.filter((c) => c.id === targetId);

  if (targets.length === 0) {
    return Response.json({ ok: true, processed: 0, message: 'Nothing to score.' });
  }

  let processed = 0;
  const errors: string[] = [];

  for (const candidate of targets) {
    try {
      const job = candidate.jobId ? jobs.find((j) => j.id === candidate.jobId) : null;
      const result = await scoreCandidateAgainstJob(
        {
          name:            candidate.name,
          position:        candidate.position,
          experienceYears: candidate.experienceYears,
          education:       candidate.education,
          skills:          candidate.skills,
          currentCompany:  candidate.currentCompany,
          languages:       candidate.languages,
          cityLocation:    candidate.cityLocation,
          linkedinUrl:     candidate.linkedinUrl,
        },
        job
          ? { title: job.title, description: job.description, requirements: job.requirements, category: job.category, type: job.type }
          : { title: candidate.position || 'General', description: '', requirements: [] },
      );

      if (result) {
        await saveAiScore(candidate.id, result.score, result.summary, result.reasoning);
        processed++;
      }
    } catch (err) {
      errors.push(`${candidate.id}: ${(err as Error).message}`);
    }
  }

  return Response.json({ ok: true, processed, total: targets.length, errors });
}
