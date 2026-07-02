import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getContracts, appendContract } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && session.user?.email === ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get('company_id') ?? undefined;
  const contracts = await getContracts(companyId);
  return Response.json(contracts, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
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
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
