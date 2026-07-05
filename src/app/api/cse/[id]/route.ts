import { revalidateTag } from 'next/cache';
import { requireTabAccess } from '@/lib/auth';
import { updateCseRep, deleteCseRep } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('enterprise', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    await updateCseRep(id, {
      name:   body.name   !== undefined ? String(body.name) : undefined,
      phone:  body.phone  !== undefined ? String(body.phone) : undefined,
      email:  body.email  !== undefined ? String(body.email) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    });
    await logAudit({ action: 'update', domain: 'enterprise', entityType: 'cse_rep', entityId: id });
    revalidateTag('enterprise-stats', { expire: 0 });
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
  try {
    await deleteCseRep(id);
    await logAudit({ action: 'delete', domain: 'enterprise', entityType: 'cse_rep', entityId: id });
    revalidateTag('enterprise-stats', { expire: 0 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
