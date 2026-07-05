import { NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth';
import { listPendingJobRequests } from '@/lib/db';

export async function GET() {
  if (!(await requireTabAccess('manage-jobs', 'view'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await listPendingJobRequests();
  return NextResponse.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}
