import { requireTabAccess } from '@/lib/auth';
import { listSystemEvents, getCronStatus, getRateLimitHitCount } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { FailureCategory } from '@/types';

// Deliberately excludes 'rate_limit' -- listSystemEvents() only ever
// queries level='error', but rate-limit hits are logged at level='info'
// (the limiter engaging is the control working, not an application
// failure -- see logRateLimitHit()). A 'rate_limit' filter option here
// would always return zero rows. Its count is exposed separately below.
const VALID_CATEGORIES: FailureCategory[] = ['webhook', 'ai_scoring', 'invoicing', 'cron', 'other'];

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('system-health', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const categoryParam = sp.get('category') ?? undefined;
  const daysParam     = sp.get('days') ?? undefined;

  if (categoryParam && !VALID_CATEGORIES.includes(categoryParam as FailureCategory)) {
    return Response.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 422 });
  }

  const days = daysParam ? Number(daysParam) : 7;
  if (!Number.isFinite(days) || days <= 0) {
    return Response.json({ error: 'days must be a positive number' }, { status: 422 });
  }

  const [events, cronStatus, rateLimitHits24h] = await Promise.all([
    listSystemEvents({ category: categoryParam as FailureCategory | undefined, days }),
    getCronStatus(),
    getRateLimitHitCount(24),
  ]);

  return Response.json({ events, cronStatus, rateLimitHits24h }, { headers: { 'Cache-Control': 'no-store' } });
}
