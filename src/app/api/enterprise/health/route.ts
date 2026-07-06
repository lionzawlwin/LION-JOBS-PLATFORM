import { requireTabAccess } from '@/lib/auth';
import { getClientHealthSummary } from '@/lib/db';

export async function GET() {
  if (!(await requireTabAccess('enterprise', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const summary = await getClientHealthSummary();
  return Response.json(summary, { headers: { 'Cache-Control': 'no-store' } });
}
