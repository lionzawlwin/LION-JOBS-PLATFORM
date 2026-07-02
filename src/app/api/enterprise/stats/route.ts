import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getEnterpriseStats } from '@/lib/db';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const stats = await getEnterpriseStats();
  return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
