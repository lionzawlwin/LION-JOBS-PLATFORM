import { NextRequest, NextResponse } from 'next/server';
import { getCandidatesByEmailOrPhone, getAgencySettings, getConsentedApplicationIds } from '@/lib/db';

// In-memory rate limiter: 5 requests per minute per IP
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000;

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute.' },
      { status: 429 },
    );
  }

  const query = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 5) {
    return NextResponse.json(
      { error: 'Please enter at least 5 characters.' },
      { status: 400 },
    );
  }

  const candidates = await getCandidatesByEmailOrPhone(query);
  const settings = await getAgencySettings();
  const consented = await getConsentedApplicationIds(candidates.map((c) => c.id), settings.termsVersion);

  const results = candidates.map((c) => {
    const hasInterviewDetails = Boolean(c.interviewLocation);
    const isConsented = consented.has(c.id);
    return {
      id:                 c.id,
      name:               c.name,
      position:           c.position,
      company:            c.company,
      stage:              c.stage,
      appliedAt:          c.appliedAt,
      needsConsent:       hasInterviewDetails && !isConsented,
      interviewLocation:  isConsented ? c.interviewLocation  : undefined,
      interviewerContact: isConsented ? c.interviewerContact : undefined,
    };
  });

  return NextResponse.json({ results });
}
