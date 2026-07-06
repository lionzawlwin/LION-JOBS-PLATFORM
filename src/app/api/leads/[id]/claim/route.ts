import { requireTabAccess } from '@/lib/auth';
import { claimB2bLeadIfUnclaimed } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// PATCH /api/leads/[id]/claim -- explicit claim/assign action, previously
// missing entirely: the only way a lead's claimed_by_cse_rep_id ever got
// set was as a side effect of a cse-role user changing its status
// (/api/leads/[id]/status), which (a) is invisible/undiscoverable in the
// UI and (b) structurally never fires for owner/admin, since that route's
// auto-claim is gated on `scope.role === 'cse'`. This route lets ANY staff
// with b2b-leads/manage assign a lead to a specific cse_reps row -- a cse
// picking their own name is "claiming it"; an owner/admin picking someone
// else is dispatching it. First-mover-wins is enforced by
// claimB2bLeadIfUnclaimed's existing `.is('claimed_by_cse_rep_id', null)`
// guard (Phase 15's shared-pool model, unchanged) -- this route doesn't
// change who can see a lead or how ownership works, only makes the
// existing claim mechanism actually reachable.
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('b2b-leads', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { cseRepId } = body as Record<string, unknown>;
  if (typeof cseRepId !== 'string' || !cseRepId) {
    return Response.json({ error: 'cseRepId is required.' }, { status: 422 });
  }

  try {
    await claimB2bLeadIfUnclaimed(id, cseRepId);
    await logAudit({ action: 'update', domain: 'b2b-leads', entityType: 'lead', entityId: id });
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/leads/[id]/claim',
      message:  'Could not claim lead',
      error:    err,
      context:  { leadId: id, cseRepId },
    });
    return Response.json({ error: 'Could not claim this lead.' }, { status: 502 });
  }
}
