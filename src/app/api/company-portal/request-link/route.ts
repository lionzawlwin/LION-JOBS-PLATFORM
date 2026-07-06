import { z } from 'zod';
import { NextResponse, type NextRequest } from 'next/server';
import { getCompanyByEmail } from '@/lib/db';
import { issueLoginToken } from '@/lib/portalAuth';
import { sendPortalLoginEmail } from '@/lib/portalEmail';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';
import { logFailure, logRateLimitHit } from '@/lib/observability';

const RATE_LIMIT_WINDOW_S = 600;
const RATE_LIMIT_MAX = 3;

const schema = z.object({ email: z.string().trim().email() });

// Always the exact same response whether or not the email matched a real
// company account -- a different response would let a caller enumerate
// which emails have accounts.
const GENERIC_RESPONSE = {
  ok: true,
  message: 'If that email is associated with a company account, a sign-in link has been sent.',
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const ipLimit = checkRateLimit(`company-portal-request-link:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!ipLimit.allowed) {
    await logRateLimitHit('/api/company-portal/request-link');
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

  // Second bucket keyed by the target email itself, not just the caller's
  // IP -- stops someone spamming one victim's inbox from many different
  // IPs. Still returns the generic response either way, so this can't be
  // used to distinguish "rate limited" from "no account" either.
  const emailLimit = checkRateLimit(`company-portal-request-link-email:${email.toLowerCase()}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!emailLimit.allowed) {
    await logRateLimitHit('/api/company-portal/request-link');
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    const company = await getCompanyByEmail(email);
    if (company) {
      const token = await issueLoginToken('company', company.id, email);
      await sendPortalLoginEmail({
        to: email,
        verifyApiPath: '/api/company-portal/verify',
        token,
        label: 'Company Portal',
      });
    }
  } catch (err) {
    // SENTRY_DSN is unset in this deployment (confirmed via find_organizations/
    // search_issues turning up nothing), so system_events is the only place
    // this error is actually visible -- include the message in context so
    // System Health / a direct query shows *why* the send failed, not just
    // that it did.
    await logFailure({
      category: 'other',
      route:    '/api/company-portal/request-link',
      message:  'Failed to issue/send portal login link',
      error:    err,
      context:  { errorMessage: err instanceof Error ? err.message : String(err) },
    });
    // Still fall through to the generic response below -- don't leak
    // internal failures to the caller.
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
