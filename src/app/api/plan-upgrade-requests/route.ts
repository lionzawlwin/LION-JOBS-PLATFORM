import { requireTabAccess } from '@/lib/auth';
import { listPlanUpgradeRequests } from '@/lib/db';

// GET /api/plan-upgrade-requests -- Batch 2, Feature 1 (Plan Upgrade
// Request Inbox). Lives under 'billing' (not 'system-health') since this
// is a commercial action, not an error/ops concern.
export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await listPlanUpgradeRequests();
  return Response.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}
