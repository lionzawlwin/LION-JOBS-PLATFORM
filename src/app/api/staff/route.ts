import { requireRole } from '@/lib/auth';
import { listStaff, createStaff } from '@/lib/db';
import type { StaffRole } from '@/types';
import type { NextRequest } from 'next/server';

const VALID_ROLES: StaffRole[] = ['owner', 'admin', 'cse', 'viewer'];

export async function GET() {
  if (!(await requireRole(['owner', 'admin']))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const staff = await listStaff();
  return Response.json(staff, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireRole(['owner', 'admin']))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.name) {
    return Response.json({ error: 'email and name are required.' }, { status: 422 });
  }
  const role = body.role !== undefined ? String(body.role) : 'viewer';
  if (!VALID_ROLES.includes(role as StaffRole)) {
    return Response.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 422 });
  }
  try {
    const id = await createStaff({
      email: String(body.email),
      name:  String(body.name),
      role:  role as StaffRole,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
