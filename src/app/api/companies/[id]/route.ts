import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCompanyStatus } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { CompanyStatus } from '@/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { status?: CompanyStatus; notes?: string };
  if (!body.status) {
    return Response.json({ error: 'status is required.' }, { status: 422 });
  }
  try {
    await updateCompanyStatus(id, body.status, body.notes);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
