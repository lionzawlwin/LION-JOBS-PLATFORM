import { NextResponse, type NextRequest } from 'next/server';
import { deactivateJobAlertSubscriptionByToken } from '@/lib/db';
import { logFailure } from '@/lib/observability';

// Job Alert Subscriptions (CTO big-upgrades roadmap, Item #2): the link
// every digest email's "Unsubscribe from this search alert" points at.
// Deliberately a GET (clicked straight from an email client, same as
// candidate-portal/verify and company-portal/verify's login links), and
// deliberately not an error when the token is unknown/already used --
// see deactivateJobAlertSubscriptionByToken()'s doc comment.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/candidate?jobAlert=missing_token', req.url));
  }

  try {
    await deactivateJobAlertSubscriptionByToken(token);
    // Redirect regardless of whether a row actually changed -- an
    // already-inactive or unknown token still lands the visitor on "you
    // are unsubscribed," which is true either way from their perspective.
    return NextResponse.redirect(new URL('/candidate?jobAlert=unsubscribed', req.url));
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/job-alerts/unsubscribe',
      message:  'Job alert unsubscribe failed',
      error:    err,
    });
    return NextResponse.redirect(new URL('/candidate?jobAlert=error', req.url));
  }
}
