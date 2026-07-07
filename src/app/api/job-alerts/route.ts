import { NextRequest, NextResponse } from 'next/server';
import { createJobAlertSubscription } from '@/lib/db';
import { logFailure, logRateLimitHit } from '@/lib/observability';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';
import type { JobCategory, JobType } from '@/types';

// Job Alert Subscriptions (CTO big-upgrades roadmap, Item #2): candidates
// save a search from /candidate and get a daily digest of new matches
// (see src/lib/jobAlertDigest.ts, piggybacked onto /api/cron/job-alerts).
// Same 3-per-IP-per-minute rate limit as /api/subscribe -- this is the
// same class of unauthenticated public write (an email address plus a
// few free-text filter values), so it gets the same guard.
const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX      = 3;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`job-alerts:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);

  if (!rl.allowed) {
    await logRateLimitHit('/api/job-alerts');
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(rl.resetIn),
          'X-RateLimit-Limit':     String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  let body: {
    email?:     string;
    keyword?:   string;
    category?:  JobCategory | '';
    type?:      JobType | '';
    location?:  string;
    salaryMin?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  try {
    const subscription = await createJobAlertSubscription({
      email,
      keyword:   body.keyword?.trim() || undefined,
      category:  body.category || undefined,
      type:      body.type || undefined,
      location:  body.location?.trim() || undefined,
      salaryMin: body.salaryMin || undefined,
    });
    return NextResponse.json({ ok: true, id: subscription.id });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/job-alerts', message: 'Job alert subscription failed', error: err });
    return NextResponse.json({ error: 'Could not save this search. Please try again.' }, { status: 500 });
  }
}
