import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInteractions, appendInteraction } from '@/lib/db';
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
  const companyId = req.nextUrl.searchParams.get('company_id');
  if (!companyId) {
    return Response.json({ error: 'company_id query param is required.' }, { status: 422 });
  }
  const interactions = await getInteractions(companyId);
  return Response.json(interactions, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
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
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
