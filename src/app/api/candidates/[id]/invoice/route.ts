import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInvoiceByApplicationId } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceByApplicationId(id);
  return Response.json({ invoice });
}
