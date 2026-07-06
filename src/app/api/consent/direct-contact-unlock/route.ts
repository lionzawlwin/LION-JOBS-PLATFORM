import { NextResponse, type NextRequest } from 'next/server';
import { verifyDirectContactOptInToken } from '@/lib/consentLinks';
import { grantDirectContactConsentForAllApplications } from '@/lib/db';
import { logFailure } from '@/lib/observability';

// GET /api/consent/direct-contact-unlock?token=... -- the Fast-Track
// Visibility campaign email's one-click link. Public, no session
// required (same posture as the portal verify routes) -- the signed
// token itself is the proof of identity. Idempotent: clicking twice (or
// a link already fully consented) just redirects to the same success
// page rather than erroring.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const candidateId = verifyDirectContactOptInToken(token);
  if (!candidateId) {
    return NextResponse.redirect(new URL('/consent/direct-contact-unlock?status=invalid', req.url));
  }

  try {
    await grantDirectContactConsentForAllApplications(candidateId);
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/consent/direct-contact-unlock',
      message:  'Failed to grant direct contact consent from opt-in link',
      error:    err,
      context:  { candidateId },
    });
    return NextResponse.redirect(new URL('/consent/direct-contact-unlock?status=error', req.url));
  }

  return NextResponse.redirect(new URL('/consent/direct-contact-unlock?status=success', req.url));
}
