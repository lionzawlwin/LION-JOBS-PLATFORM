import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return NextResponse.json({ configured: Boolean(process.env.RESEND_API_KEY) });
}
