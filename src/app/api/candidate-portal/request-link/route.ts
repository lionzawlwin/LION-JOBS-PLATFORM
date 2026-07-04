import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { getCandidateRecordByEmail } from '@/lib/db';
import { issueLoginToken } from '@/lib/portalAuth';
import { sendPortalLoginEmail } from '@/lib/portalEmail';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';
import { logFailure, logRateLimitHit } from '@/lib/observability';

const RATE_LIMIT_WINDOW_S = 600;
const RATE_LIMIT_MAX = 3;

const schema = z.object({ email: z.string().trim().email() });

// Always the exact same response whether or not the email matched a real
// candidate account -- a different response would let a caller enumerate
// which emails have applied.
const GENERIC_RESPONSE = {
  ok: true,
  message: 'If that email is associated with an application, a sign-in link has been sent.',
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`candidate-portal-request-link:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!ipLimit.allowed) {
    await logRateLimitHit('/api/candidate-portal/request-link');
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.resetIn) } },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 422 });
  }
  const email = parsed.data.email;

  const emailLimit = checkRateLimit(`candidate-portal-request-link-email:${email.toLowerCase()}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!emailLimit.allowed) {
    await logRateLimitHit('/api/candidate-portal/request-link');
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    const candidate = await getCandidateRecordByEmail(email);
    if (candidate) {
      const token = await issueLoginToken('candidate', candidate.id, email);
      await sendPortalLoginEmail({
        to: email,
        verifyApiPath: '/api/candidate-portal/verify',
        token,
        label: 'Candidate Portal',
      });
    }
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidate-portal/request-link', message: 'Failed to issue/send portal login link', error: err });
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
