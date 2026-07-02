import { requireStaff } from '@/lib/auth';
import { updateCandidateCvUrl } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
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
    console.error('[cv-url/patch]', err);
    return Response.json({ error: 'Could not update CV URL.' }, { status: 502 });
  }
}
