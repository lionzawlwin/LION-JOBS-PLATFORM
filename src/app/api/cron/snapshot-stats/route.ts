import { NextResponse } from 'next/server';
import { recordDailySnapshot } from '@/lib/db';
import { logFailure, logCronSuccess } from '@/lib/observability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE = '/api/cron/snapshot-stats';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await recordDailySnapshot();
    await logCronSuccess(ROUTE, 'Daily stats snapshot recorded');
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logFailure({
      category: 'cron',
      route:    ROUTE,
      message:  'Failed to record daily stats snapshot',
      error:    err,
    });
    return NextResponse.json({ ok: false, error: 'Failed to record snapshot' }, { status: 500 });
  }
}
