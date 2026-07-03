import { requireTabAccess } from '@/lib/auth';
import { updateCandidateInterviewDetails } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('candidates', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: { interviewLocation?: string; interviewerContact?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    await updateCandidateInterviewDetails(id, body.interviewLocation ?? '', body.interviewerContact ?? '');
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/interview', message: 'Could not update interview details', error: err, context: { applicationId: id } });
    return Response.json({ error: 'Could not update interview details.' }, { status: 502 });
  }
}
