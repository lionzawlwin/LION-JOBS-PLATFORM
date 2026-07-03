import { requireTabAccess } from '@/lib/auth';
import { deleteB2bLead } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('b2b-leads', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    await deleteB2bLead(id);
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/leads/[id]', message: 'Could not delete lead', error: err, context: { leadId: id } });
    return Response.json({ error: 'Could not delete lead.' }, { status: 502 });
  }
}
