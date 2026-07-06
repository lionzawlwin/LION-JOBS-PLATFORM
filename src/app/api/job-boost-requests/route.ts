import { requireTabAccess } from '@/lib/auth';
import { listJobBoostRequests } from '@/lib/db';

// GET /api/job-boost-requests -- staff inbox, same 'billing' placement as
// /api/featured-placement-requests (a commercial action, not an error/ops
// concern).
export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await listJobBoostRequests();
  return Response.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}
