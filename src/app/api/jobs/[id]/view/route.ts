import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, checkRateLimit } from '@/lib/apiSecurity';
import { logRateLimitHit } from '@/lib/observability';
import { incrementJobViewCount } from '@/lib/db';

const RATE_LIMIT_WINDOW_S = 60;
const RATE_LIMIT_MAX      = 20; // one visitor loading several job pages a minute is normal; scripted inflation is not

// POST /api/jobs/[id]/view — public, fire-and-forget from the job detail
// page. Approximate by design (in-memory rate limit, no dedup by visitor) —
// this is a top-of-funnel engagement signal for the employer portal, not a
// billing-relevant or security-sensitive number.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`job-view:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!rl.allowed) {
    await logRateLimitHit('/api/jobs/[id]/view');
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const { id } = await context.params;
  await incrementJobViewCount(id);
  return NextResponse.json({ ok: true });
}
