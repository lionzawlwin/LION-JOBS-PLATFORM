import { requireTabAccess } from '@/lib/auth';
import { getOptInCampaignStats } from '@/lib/db';

// GET /api/opt-in-campaign/status -- staff-facing progress counters for
// the Fast-Track Visibility opt-in campaign (Billing tab).
export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await getOptInCampaignStats();
  return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
