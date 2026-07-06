import { requireTabAccess } from '@/lib/auth';
import { getAccountPlans } from '@/lib/db';

export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const plans = await getAccountPlans();
  return Response.json(plans, { headers: { 'Cache-Control': 'no-store' } });
}
