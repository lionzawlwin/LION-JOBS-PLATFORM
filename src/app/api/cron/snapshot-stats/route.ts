import { NextResponse } from 'next/server';
import { recordDailySnapshot, expireFeaturedPlacements, expireJobBoosts } from '@/lib/db';
import { logFailure, logCronSuccess } from '@/lib/observability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROUTE = '/api/cron/snapshot-stats';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Piggybacked, not a separate cron slot -- same pattern as job-alerts
  // running the health check and CRM digest. Isolated in its own try/catch
  // so a failure here never blocks the actual daily snapshot below.
  let expiredCount = 0;
  try {
    expiredCount = await expireFeaturedPlacements();
  } catch (err) {
    await logFailure({
      category: 'cron',
      route:    ROUTE,
      message:  'Failed to expire featured placements',
      error:    err,
    });
  }

  let expiredJobBoostCount = 0;
  try {
    expiredJobBoostCount = await expireJobBoosts();
  } catch (err) {
    await logFailure({
      category: 'cron',
      route:    ROUTE,
      message:  'Failed to expire job boosts',
      error:    err,
    });
  }

  try {
    await recordDailySnapshot();
    await logCronSuccess(
      ROUTE,
      `Daily stats snapshot recorded (expired ${expiredCount} featured placement${expiredCount === 1 ? '' : 's'}, ${expiredJobBoostCount} job boost${expiredJobBoostCount === 1 ? '' : 's'})`,
    );
    return NextResponse.json({ ok: true, expiredFeaturedPlacements: expiredCount, expiredJobBoosts: expiredJobBoostCount });
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
