import { NextRequest, NextResponse } from 'next/server';
import { appendEmailSubscriber } from '@/lib/db';
import { logFailure, logRateLimitHit } from '@/lib/observability';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';

// 3 submissions per IP per minute — was previously a private in-memory
// Map duplicating apiSecurity.ts's shared rate limiter; consolidated onto
// the shared implementation instead of maintaining two copies of the
// same logic.
const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX      = 3;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`subscribe:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);

  if (!rl.allowed) {
    await logRateLimitHit('/api/subscribe');
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

  let body: { email?: string; category?: string };
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
    await appendEmailSubscriber({ email, category: body.category, ip });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/subscribe', message: 'Subscription failed', error: err });
    return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
