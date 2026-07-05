import { requireTabAccess } from '@/lib/auth';
import { getCandidates, saveAiScore } from '@/lib/db';
import { getJobs } from '@/lib/db';
import { scoreCandidateAgainstJob } from '@/lib/ai/cvAnalyzer';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

/**
 * POST /api/analyze-cv
 * Body: { applicationId: string } — re-run AI scoring for one application
 *       { all: true }             — batch-process all unscored applications
 *
 * Auth: any authenticated staff member
 */
export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('candidates', 'manage'))) {
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
        await logAudit({ action: 'update', domain: 'candidates', entityType: 'candidate', entityId: candidate.id });
        processed++;
      }
    } catch (err) {
      const msg = `${candidate.id}: ${(err as Error).message}`;
      errors.push(msg);
      await logFailure({
        category: 'ai_scoring',
        route:    '/api/analyze-cv',
        message:  msg,
        error:    err,
        context:  { applicationId: candidate.id },
      });
    }
  }

  return Response.json({ ok: true, processed, total: targets.length, errors });
}
