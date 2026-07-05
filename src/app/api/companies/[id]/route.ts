import { revalidateTag } from 'next/cache';
import { requireTabAccess } from '@/lib/auth';
import { updateCompanyStatus, updateCompanyTier, updateCompanyCommissionRate, updateCompanyIsInternal, deleteCompany } from '@/lib/db';
import { logAudit } from '@/lib/audit';
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
    isInternal?:        boolean;
  };
  if (!body.status && !body.tier && body.commissionRatePct === undefined && body.isInternal === undefined) {
    return Response.json({ error: 'status, tier, commissionRatePct, or isInternal is required.' }, { status: 422 });
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
    if (body.tier)   { await updateCompanyTier(id, body.tier); revalidateTag('enterprise-stats', { expire: 0 }); }
    if (body.commissionRatePct !== undefined) await updateCompanyCommissionRate(id, body.commissionRatePct);
    if (body.isInternal !== undefined) await updateCompanyIsInternal(id, body.isInternal);
    await logAudit({ action: 'update', domain: 'companies', entityType: 'company', entityId: id });
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
    await logAudit({ action: 'delete', domain: 'companies', entityType: 'company', entityId: id });
    revalidateTag('enterprise-stats', { expire: 0 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
