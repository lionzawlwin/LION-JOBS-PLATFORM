import { NextRequest, NextResponse } from 'next/server';
import { appendEmailSubscriber } from '@/lib/sheets';

// In-memory sliding-window rate limit: 3 requests per IP per minute
const ipLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now    = Date.now();
  const window = 60_000;
  const limit  = 3;
  const times  = (ipLog.get(ip) ?? []).filter((t) => now - t < window);
  if (times.length >= limit) return true;
  times.push(now);
  ipLog.set(ip, times);
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
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
    console.error('[api/subscribe]', err);
    return NextResponse.json({ error: 'Subscription failed. Please try again.' }, { status: 500 });
  }
}
