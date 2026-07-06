import { requireTabAccess } from '@/lib/auth';
import { listFeaturedPlacementRequests } from '@/lib/db';

// GET /api/featured-placement-requests -- staff inbox, same 'billing'
// placement as /api/plan-upgrade-requests (a commercial action, not an
// error/ops concern).
export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await listFeaturedPlacementRequests();
  return Response.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}
