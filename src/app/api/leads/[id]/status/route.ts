import { requireTabAccess } from '@/lib/auth';
import { updateB2bLeadStatus } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

const VALID_STATUSES = new Set([
  'New', 'In Review', 'Pending', 'Active', 'Interview', 'Placed', 'On Hold', 'Rejected', 'Closed',
]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('b2b-leads', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { status } = body as { status?: string };
  if (!status || !VALID_STATUSES.has(status)) {
    return Response.json(
      { error: `Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}` },
      { status: 422 },
    );
  }

  try {
    await updateB2bLeadStatus(id, status);
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/leads/[id]/status', message: 'Could not update lead status', error: err, context: { leadId: id } });
    if (process.env.NODE_ENV !== 'production') {
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ error: 'Could not update lead status.' }, { status: 502 });
  }
}
