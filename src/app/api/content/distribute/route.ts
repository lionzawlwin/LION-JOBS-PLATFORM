import { NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth';

export async function POST() {
  if (!(await requireTabAccess('content', 'manage'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  return NextResponse.json(
    {
      ok:      false,
      message: 'Direct social distribution not configured. Use the publish-job webhook instead.',
    },
    { status: 501 },
  );
}
