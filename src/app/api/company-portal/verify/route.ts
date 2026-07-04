import { NextResponse, type NextRequest } from 'next/server';
import { consumeLoginToken, createSessionToken, PORTAL_COOKIE_NAMES, sessionCookieOptions } from '@/lib/portalAuth';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/company/portal/login?error=missing_token', req.url));
  }

  const consumed = await consumeLoginToken(token);
  if (!consumed || consumed.subjectType !== 'company') {
    return NextResponse.redirect(new URL('/company/portal/login?error=invalid_or_expired', req.url));
  }

  const sessionToken = createSessionToken('company', consumed.subjectId);
  const response = NextResponse.redirect(new URL('/company/portal', req.url));
  response.cookies.set(PORTAL_COOKIE_NAMES.company, sessionToken, sessionCookieOptions());
  return response;
}
