import { NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth';
import { listPendingJobRequests, getCompanies } from '@/lib/db';
import { attachCompanyNames } from '@/lib/jobRequestsView';

export async function GET() {
  if (!(await requireTabAccess('manage-jobs', 'view'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [requests, companies] = await Promise.all([listPendingJobRequests(), getCompanies()]);
  const enriched = attachCompanyNames(requests, companies);

  return NextResponse.json(enriched, { headers: { 'Cache-Control': 'no-store' } });
}
