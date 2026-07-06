import { requireTabAccess } from '@/lib/auth';
import { getRevenueSummary } from '@/lib/db';

// GET /api/revenue-summary -- Commercial/Revenue Overview panel, top of
// the Billing tab. Read-only aggregation, same 'billing' view access as
// every other Billing-tab data source.
export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const summary = await getRevenueSummary();
  return Response.json(summary, { headers: { 'Cache-Control': 'no-store' } });
}
