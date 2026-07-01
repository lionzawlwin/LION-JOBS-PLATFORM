import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCompanyStatus, updateCompanyTier, deleteCompany } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { CompanyStatus, CompanyTier } from '@/types';

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
  const body = await req.json().catch(() => ({})) as {
    status?: CompanyStatus;
    notes?:  string;
    tier?:   CompanyTier;
  };
  if (!body.status && !body.tier) {
    return Response.json({ error: 'status or tier is required.' }, { status: 422 });
  }
  try {
    if (body.status) await updateCompanyStatus(id, body.status, body.notes);
    if (body.tier)   await updateCompanyTier(id, body.tier);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteCompany(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
