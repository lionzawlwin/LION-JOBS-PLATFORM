import { requireTabAccess } from '@/lib/auth';
import { updateCandidateJob } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('candidates', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { jobId, jobTitle, company, clear } = body as {
    jobId?: string; jobTitle?: string; company?: string; clear?: boolean;
  };
  if (!clear && !jobTitle) {
    return Response.json({ error: 'jobTitle is required (or pass clear: true to unlink).' }, { status: 422 });
  }

  try {
    await updateCandidateJob(id, jobId ?? '', jobTitle ?? '', company ?? '');
    await logAudit({ action: 'update', domain: 'candidates', entityType: 'candidate', entityId: id });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/job', message: 'Could not update job link', error: err, context: { applicationId: id } });
    if (process.env.NODE_ENV !== 'production') {
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ error: 'Could not update job link.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
