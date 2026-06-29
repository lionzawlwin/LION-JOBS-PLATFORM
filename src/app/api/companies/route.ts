import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getCompanies, appendCompany } from '@/lib/sheets';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) return false;
  return true;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companies = await getCompanies();
  return Response.json(companies, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
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
      notes:         String(body.notes ?? ''),
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
