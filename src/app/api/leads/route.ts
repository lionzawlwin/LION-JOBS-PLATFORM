import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getB2bLeads } from '@/lib/sheets';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leads = await getB2bLeads();
  return Response.json(leads);
}
