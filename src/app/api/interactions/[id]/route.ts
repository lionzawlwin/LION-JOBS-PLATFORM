import { revalidateTag } from 'next/cache';
import { requireTabAccess } from '@/lib/auth';
import { deleteInteraction } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('enterprise', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteInteraction(id);
    await logAudit({ action: 'delete', domain: 'enterprise', entityType: 'interaction', entityId: id });
    revalidateTag('client-health', { expire: 0 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
