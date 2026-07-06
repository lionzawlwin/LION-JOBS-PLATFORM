import { revalidateTag } from 'next/cache';
import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { getInteractions, appendInteraction, getContracts } from '@/lib/db';
import { deriveActiveCseByCompany } from '@/lib/cseScope';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('enterprise', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get('company_id');
  if (!companyId) {
    return Response.json({ error: 'company_id query param is required.' }, { status: 422 });
  }

  const scope = await getSessionScope();
  if (scope?.role === 'cse') {
    const contracts = await getContracts();
    const owner = deriveActiveCseByCompany(contracts).get(companyId);
    if (!owner || owner !== scope.cseRepId) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }
  }

  const interactions = await getInteractions(companyId);
  return Response.json(interactions, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('enterprise', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.companyId || !body?.type || !body?.note) {
    return Response.json({ error: 'companyId, type, and note are required.' }, { status: 422 });
  }
  try {
    const id = await appendInteraction({
      companyId:     String(body.companyId),
      type:          String(body.type),
      note:          String(body.note),
      loggedByCseId: body.loggedByCseId !== undefined ? String(body.loggedByCseId) : undefined,
      occurredAt:    body.occurredAt    !== undefined ? String(body.occurredAt) : undefined,
    });
    await logAudit({ action: 'create', domain: 'enterprise', entityType: 'interaction', entityId: id });
    revalidateTag('client-health', { expire: 0 });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
