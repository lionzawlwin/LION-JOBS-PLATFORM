import { requireTabAccess } from '@/lib/auth';
import { getEnterpriseStats } from '@/lib/db';

export async function GET() {
  if (!(await requireTabAccess('enterprise', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const stats = await getEnterpriseStats();
  return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
