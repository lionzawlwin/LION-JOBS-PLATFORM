import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return NextResponse.json({ configured: Boolean(process.env.RESEND_API_KEY) });
}
