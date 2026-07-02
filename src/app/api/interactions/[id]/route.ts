import { requireStaff } from '@/lib/auth';
import { deleteInteraction } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteInteraction(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
