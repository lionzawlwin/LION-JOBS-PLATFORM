import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { resolveSystemEvent } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('system-health', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getServerSession(authOptions);
  const resolvedBy = session?.user?.email;
  if (!resolvedBy) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await resolveSystemEvent(id, resolvedBy);
    await logAudit({ action: 'update', domain: 'system-health', entityType: 'system_event', entityId: id });
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/system-events/[id]/resolve',
      message:  'Could not resolve system event',
      error:    err,
      context:  { eventId: id },
    });
    return Response.json({ error: 'Could not resolve system event.' }, { status: 502 });
  }
}
