import { getJobs } from '@/lib/sheets';
import type { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  try {
    const jobs = await getJobs();
    return Response.json(jobs, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[/api/jobs]', err);
    return Response.json(
      { error: 'Failed to load jobs. Check server configuration.' },
      { status: 503 },
    );
  }
}
