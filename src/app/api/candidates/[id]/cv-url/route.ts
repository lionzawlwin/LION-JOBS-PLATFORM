import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCandidateCvUrl } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
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
