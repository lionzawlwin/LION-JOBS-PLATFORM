import { NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth';

export async function GET() {
  if (!(await requireTabAccess('campaigns', 'view'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return NextResponse.json({ configured: Boolean(process.env.RESEND_API_KEY) });
}
