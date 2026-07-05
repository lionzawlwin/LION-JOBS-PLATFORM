import { requireRole } from '@/lib/auth';
import { updateStaff } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { StaffRole } from '@/types';
import type { NextRequest } from 'next/server';

const VALID_ROLES: StaffRole[] = ['owner', 'admin', 'cse', 'viewer'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireRole(['owner', 'admin']))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  if (body.role !== undefined && !VALID_ROLES.includes(body.role as StaffRole)) {
    return Response.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 422 });
  }

  try {
    await updateStaff(id, {
      name:     body.name     !== undefined ? String(body.name) : undefined,
      role:     body.role     !== undefined ? (body.role as StaffRole) : undefined,
      active:   body.active   !== undefined ? Boolean(body.active) : undefined,
      cseRepId: body.cseRepId !== undefined ? (body.cseRepId === null ? null : String(body.cseRepId)) : undefined,
    });
    await logAudit({ action: 'update', domain: 'staff', entityType: 'staff', entityId: id });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
