import { revalidateTag } from 'next/cache';
import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { getContracts, appendContract } from '@/lib/db';
import { deriveActiveCseByCompany } from '@/lib/cseScope';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('enterprise', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get('company_id') ?? undefined;
  const scope = await getSessionScope();
  const cseRepId = scope?.role === 'cse' ? (scope.cseRepId ?? '__none__') : undefined;
  const contracts = await getContracts(companyId, cseRepId);
  return Response.json(contracts, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('enterprise', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.companyId || body?.value === undefined) {
    return Response.json({ error: 'companyId and value are required.' }, { status: 422 });
  }

  // Layer 24 (AppSec review): GET already row-scopes contracts to a CSE's
  // own companies; POST had no equivalent check, so a cse-role session
  // (which passes the requireTabAccess check above the same as owner/admin)
  // could write a contract against ANY companyId, not just ones they own.
  // Blocks only on a *conflicting* existing owner -- a company with no
  // Active contract yet has no owner in this map, and a CSE onboarding a
  // brand-new client is exactly how ownership gets established in the
  // first place, so that path stays open.
  const scope = await getSessionScope();
  if (scope?.role === 'cse') {
    const existingContracts = await getContracts();
    const owner = deriveActiveCseByCompany(existingContracts).get(String(body.companyId));
    if (owner && owner !== scope.cseRepId) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }
  }

  try {
    const id = await appendContract({
      companyId:    String(body.companyId),
      value:        Number(body.value),
      currency:     body.currency     !== undefined ? String(body.currency) : undefined,
      contractType: body.contractType !== undefined ? String(body.contractType) : undefined,
      status:       body.status       !== undefined ? String(body.status) : undefined,
      startDate:    body.startDate    !== undefined ? String(body.startDate) : undefined,
      endDate:      body.endDate      !== undefined ? String(body.endDate) : undefined,
      cseId:        body.cseId        !== undefined ? String(body.cseId) : undefined,
      notes:        body.notes        !== undefined ? String(body.notes) : undefined,
    });
    await logAudit({ action: 'create', domain: 'enterprise', entityType: 'contract', entityId: id });
    revalidateTag('enterprise-stats', { expire: 0 });
    revalidateTag('client-health', { expire: 0 });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
