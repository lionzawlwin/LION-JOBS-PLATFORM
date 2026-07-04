import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { appendFeedback, getCompanyFeedback } from '@/lib/db';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';
import { logRateLimitHit } from '@/lib/observability';

// 5 submissions per IP per 10 minutes — a candidate leaves one review per
// interview experience; generous while blocking scripted floods against
// this fully public, unauthenticated write endpoint.
const RATE_LIMIT_WINDOW_S = 600;
const RATE_LIMIT_MAX      = 5;

const feedbackSchema = z.object({
  candidateId:    z.string().trim().min(1).max(100),
  company:        z.string().trim().min(1).max(200),
  jobTitle:       z.string().trim().max(200).optional(),
  rating:         z.number().int().min(1).max(5),
  experience:     z.string().trim().min(10).max(5000),
  wouldRecommend: z.boolean().optional(),
});

// GET /api/feedback?company=COMPANY_NAME — aggregate rating for company page
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get('company')?.trim();
  if (!company) {
    return NextResponse.json({ error: 'company param required' }, { status: 400 });
  }

  const result = await getCompanyFeedback(company);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' },
  });
}

// POST /api/feedback — submit interview feedback
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`feedback:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!rl.allowed) {
    await logRateLimitHit('/api/feedback');
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a few minutes and try again.' },
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

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 422 },
    );
  }

  const body = parsed.data;
  try {
    await appendFeedback({
      candidateId: body.candidateId,
      company: body.company,
      jobTitle: body.jobTitle ?? '',
      rating: body.rating,
      experience: body.experience,
      wouldRecommend: body.wouldRecommend === true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
