import { requireTabAccess } from '@/lib/auth';
import { getPlanUsageSummary } from '@/lib/db';

export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const summary = await getPlanUsageSummary();
  return Response.json(summary, { headers: { 'Cache-Control': 'no-store' } });
}
