import { requireStaff } from '@/lib/auth';
import { getCseReps, appendCseRep } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET() {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const reps = await getCseReps();
  return Response.json(reps, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return Response.json({ error: 'name is required.' }, { status: 422 });
  }
  try {
    const id = await appendCseRep({
      name:  String(body.name),
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      email: body.email !== undefined ? String(body.email) : undefined,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
