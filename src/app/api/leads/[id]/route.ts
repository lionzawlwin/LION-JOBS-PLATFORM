import { requireStaff } from '@/lib/auth';
import { deleteB2bLead } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await deleteB2bLead(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[leads/delete]', err);
    return Response.json({ error: 'Could not delete lead.' }, { status: 502 });
  }
}
