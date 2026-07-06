import { requireTabAccess } from '@/lib/auth';
import { listContactUnlockRequests } from '@/lib/db';

// GET /api/contact-unlock-requests -- staff inbox, same 'billing'
// placement as /api/featured-placement-requests and /api/job-boost-requests
// (a commercial action, not an error/ops concern).
export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await listContactUnlockRequests();
  return Response.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}
