import { requireTabAccess } from '@/lib/auth';
import { updateCandidateCvUrl } from '@/lib/db';
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
  let body: { cvUrl?: string };
  try { body = await req.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { cvUrl = '' } = body;
  try {
    await updateCandidateCvUrl(id, cvUrl);
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/cv-url', message: 'Could not update CV URL', error: err, context: { applicationId: id } });
    return Response.json({ error: 'Could not update CV URL.' }, { status: 502 });
  }
}
