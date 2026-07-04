import { requireTabAccess } from '@/lib/auth';
import { getJobById, getCandidates } from '@/lib/db';
import { computeAlgorithmicMatch } from '@/lib/matching/algorithmicMatch';
import type { NextRequest } from 'next/server';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('candidates', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const job = await getJobById(id);
  if (!job) {
    return Response.json({ error: 'Job not found.' }, { status: 404 });
  }

  const limitParam = Number(req.nextUrl.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(Math.floor(limitParam), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const allApplications = await getCandidates();

  // getCandidates() returns one row per application, so the same person
  // can appear multiple times if they've applied to several jobs. We're
  // suggesting people, not applications, so dedupe by phone (a required
  // field on every candidate row, unlike email) before ranking.
  const seenPhones = new Set<string>();
  const uniqueCandidates = allApplications.filter((c) => {
    if (seenPhones.has(c.phone)) return false;
    seenPhones.add(c.phone);
    return true;
  });

  const ranked = uniqueCandidates
    .map((candidate) => ({
      candidate,
      match: computeAlgorithmicMatch(
        {
          skills:          candidate.skills ?? null,
          experienceYears: candidate.experienceYears ?? null,
          cityLocation:    candidate.cityLocation ?? null,
          education:       candidate.education ?? null,
          currentCompany:  candidate.currentCompany ?? null,
        },
        {
          title:        job.title,
          description:  job.description,
          requirements: job.requirements,
          location:     job.location,
          type:         job.type,
        },
      ),
    }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);

  return Response.json({
    job:   { id: job.id, title: job.title },
    total: uniqueCandidates.length,
    results: ranked.map(({ candidate, match }) => ({
      candidateId:     candidate.id,
      name:            candidate.name,
      phone:           candidate.phone,
      cityLocation:    candidate.cityLocation ?? null,
      experienceYears: candidate.experienceYears ?? null,
      score:           match.score,
      breakdown:       match.breakdown,
      reasons:         match.reasons,
    })),
  });
}
