import { revalidateTag } from 'next/cache';
import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { updateContract, deleteContract, getContracts } from '@/lib/db';
import { deriveActiveCseByCompany } from '@/lib/cseScope';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

// Layer 24 (AppSec review): PATCH/DELETE here operate on an existing
// contract by id with no ownership check at all -- the "companies" GET
// route already only ever shows a CSE their own book, so a CSE session
// mutating/deleting a contract belonging to a company outside that book
// should be blocked the same way. Returns true (allow) if the contract
// can't be found -- the mutation itself will 404/error, this check's only
// job is to block cross-book access.
async function cseMayMutateContract(cseRepId: string | null, contractId: string): Promise<boolean> {
  const contracts = await getContracts();
  const contract = contracts.find((c) => c.id === contractId);
  if (!contract) return true;
  const owner = deriveActiveCseByCompany(contracts).get(contract.companyId);
  return !owner || owner === cseRepId;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('enterprise', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;

  const scope = await getSessionScope();
  if (scope?.role === 'cse' && !(await cseMayMutateContract(scope.cseRepId, id))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    await updateContract(id, {
      value:        body.value        !== undefined ? Number(body.value) : undefined,
      currency:     body.currency     !== undefined ? String(body.currency) : undefined,
      contractType: body.contractType !== undefined ? String(body.contractType) : undefined,
      status:       body.status       !== undefined ? String(body.status) : undefined,
      startDate:    body.startDate    !== undefined ? String(body.startDate) : undefined,
      endDate:      body.endDate      !== undefined ? String(body.endDate) : undefined,
      cseId:        body.cseId        !== undefined ? String(body.cseId) : undefined,
      notes:        body.notes        !== undefined ? String(body.notes) : undefined,
    });
    await logAudit({ action: 'update', domain: 'enterprise', entityType: 'contract', entityId: id });
    revalidateTag('enterprise-stats', { expire: 0 });
    revalidateTag('client-health', { expire: 0 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('enterprise', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;

  const scope = await getSessionScope();
  if (scope?.role === 'cse' && !(await cseMayMutateContract(scope.cseRepId, id))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  try {
    await deleteContract(id);
    await logAudit({ action: 'delete', domain: 'enterprise', entityType: 'contract', entityId: id });
    revalidateTag('enterprise-stats', { expire: 0 });
    revalidateTag('client-health', { expire: 0 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
