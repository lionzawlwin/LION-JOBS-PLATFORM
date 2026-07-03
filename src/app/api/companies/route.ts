import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { getCompanies, appendCompany, getContracts } from '@/lib/db';
import { filterCompaniesForCse } from '@/lib/cseScope';
import type { NextRequest } from 'next/server';

export async function GET() {
  if (!(await requireTabAccess('companies', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const scope = await getSessionScope();
  const companies = await getCompanies();

  if (scope?.role === 'cse') {
    const contracts = await getContracts();
    const scoped = filterCompaniesForCse(companies, contracts, scope.cseRepId);
    return Response.json(scoped, { headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json(companies, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('companies', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email) {
    return Response.json({ error: 'name and email are required.' }, { status: 422 });
  }
  try {
    const id = await appendCompany({
      name:          String(body.name),
      contactPerson: String(body.contactPerson ?? ''),
      email:         String(body.email),
      phone:         String(body.phone ?? ''),
      industry:      String(body.industry ?? 'Other'),
      city:          String(body.city ?? 'Yangon'),
      status:        body.status ?? 'Lead',
      tier:          body.tier ?? 'smb',
      notes:         String(body.notes ?? ''),
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
