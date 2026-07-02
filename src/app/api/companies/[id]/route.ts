import { requireTabAccess } from '@/lib/auth';
import { updateCompanyStatus, updateCompanyTier, updateCompanyCommissionRate, deleteCompany } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { CompanyStatus, CompanyTier } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('companies', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?:            CompanyStatus;
    notes?:             string;
    tier?:              CompanyTier;
    commissionRatePct?: number | null;
  };
  if (!body.status && !body.tier && body.commissionRatePct === undefined) {
    return Response.json({ error: 'status, tier, or commissionRatePct is required.' }, { status: 422 });
  }
  if (
    body.commissionRatePct !== undefined && body.commissionRatePct !== null &&
    (typeof body.commissionRatePct !== 'number' || !Number.isFinite(body.commissionRatePct) ||
     body.commissionRatePct < 0 || body.commissionRatePct > 100)
  ) {
    return Response.json({ error: 'commissionRatePct must be a number between 0 and 100.' }, { status: 422 });
  }
  try {
    if (body.status) await updateCompanyStatus(id, body.status, body.notes);
    if (body.tier)   await updateCompanyTier(id, body.tier);
    if (body.commissionRatePct !== undefined) await updateCompanyCommissionRate(id, body.commissionRatePct);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('companies', 'manage'))) {
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
