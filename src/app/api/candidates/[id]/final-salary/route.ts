import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCandidateFinalSalary } from '@/lib/db';
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
  let body: { finalAgreedSalary?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    typeof body.finalAgreedSalary !== 'number' ||
    !Number.isFinite(body.finalAgreedSalary) ||
    body.finalAgreedSalary < 0
  ) {
    return Response.json({ error: 'finalAgreedSalary must be a non-negative number.' }, { status: 422 });
  }

  try {
    await updateCandidateFinalSalary(id, body.finalAgreedSalary);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[final-salary/patch]', err);
    return Response.json({ error: 'Could not update final agreed salary.' }, { status: 502 });
  }
}
