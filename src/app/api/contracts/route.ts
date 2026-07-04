import { revalidateTag } from 'next/cache';
import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { getContracts, appendContract } from '@/lib/db';
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
    revalidateTag('enterprise-stats', { expire: 0 });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
