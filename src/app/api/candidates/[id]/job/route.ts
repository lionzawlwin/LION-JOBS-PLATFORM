import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCandidateJob } from '@/lib/sheets';
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { jobId, jobTitle, company } = body as { jobId?: string; jobTitle?: string; company?: string };
  if (!jobId || !jobTitle) {
    return Response.json({ error: 'jobId and jobTitle are required.' }, { status: 422 });
  }

  try {
    await updateCandidateJob(id, jobId, jobTitle, company ?? '');
  } catch (err) {
    console.error('[candidates/job] error:', err);
    if (process.env.NODE_ENV !== 'production') {
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ error: 'Could not update job link.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
