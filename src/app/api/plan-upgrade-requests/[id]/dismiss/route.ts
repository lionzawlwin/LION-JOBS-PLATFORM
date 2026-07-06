import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { resolveSystemEvent } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';

// POST /api/plan-upgrade-requests/[id]/dismiss -- clears a request from the
// inbox without changing the company's plan or creating an invoice (e.g.
// staff already handled it manually, or it's a duplicate).
export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getServerSession(authOptions);
  const resolvedBy = session?.user?.email;
  if (!resolvedBy) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  try {
    await resolveSystemEvent(id, resolvedBy);
    await logAudit({ action: 'update', domain: 'billing', entityType: 'plan_upgrade_request', entityId: id });
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/plan-upgrade-requests/[id]/dismiss',
      message:  'Could not dismiss plan upgrade request',
      error:    err,
      context:  { requestId: id },
    });
    return Response.json({ error: 'Could not dismiss this request.' }, { status: 502 });
  }
}
