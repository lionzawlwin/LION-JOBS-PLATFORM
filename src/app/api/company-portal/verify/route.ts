import { NextResponse, type NextRequest } from 'next/server';
import { consumeLoginToken, createSessionToken, PORTAL_COOKIE_NAMES, sessionCookieOptions } from '@/lib/portalAuth';
import { getSeatRoleForCompanyEmail } from '@/lib/db';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/company/portal/login?error=missing_token', req.url));
  }

  const consumed = await consumeLoginToken(token);
  if (!consumed || consumed.subjectType !== 'company') {
    return NextResponse.redirect(new URL('/company/portal/login?error=invalid_or_expired', req.url));
  }

  // Layer 3 (Module #1): resolve this specific (companyId, email) pair's
  // seat role now, once, at session-creation time -- defaults to 'owner'
  // if no active seat row matches, which is every company's exact
  // pre-Layer-3 access level.
  const seatRole = await getSeatRoleForCompanyEmail(consumed.subjectId, consumed.email);
  const sessionToken = createSessionToken('company', consumed.subjectId, { seatRole });
  // ?login=success is a one-time signal for CompanyPortalClientImpl.tsx to
  // fire a GA4 portal_login event and then strip itself from the URL --
  // distinguishes an actual login from every subsequent page view/refresh
  // of the same portal session.
  const response = NextResponse.redirect(new URL('/company/portal?login=success', req.url));
  response.cookies.set(PORTAL_COOKIE_NAMES.company, sessionToken, sessionCookieOptions());
  return response;
}
