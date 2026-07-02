import { requireStaff } from '@/lib/auth';
import { getB2bLeads } from '@/lib/db';

export async function GET() {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leads = await getB2bLeads();
  return Response.json(leads);
}
