import { requireStaff } from '@/lib/auth';
import { updateB2bLeadStatus } from '@/lib/db';
import type { NextRequest } from 'next/server';

const VALID_STATUSES = new Set([
  'New', 'In Review', 'Pending', 'Active', 'Interview', 'Placed', 'On Hold', 'Rejected', 'Closed',
]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
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
    console.error('[leads/status] error:', err);
    if (process.env.NODE_ENV !== 'production') {
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ error: 'Could not update lead status.' }, { status: 502 });
  }
}
