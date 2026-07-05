import { requireTabAccess } from '@/lib/auth';
import { getStatsHistory } from '@/lib/db';

export async function GET() {
  if (!(await requireTabAccess('overview', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const history = await getStatsHistory(30);
  return Response.json({ history }, { headers: { 'Cache-Control': 'no-store' } });
}
