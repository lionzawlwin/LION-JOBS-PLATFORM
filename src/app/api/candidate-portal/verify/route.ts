import { NextResponse, type NextRequest } from 'next/server';
import { consumeLoginToken, createSessionToken, PORTAL_COOKIE_NAMES, sessionCookieOptions } from '@/lib/portalAuth';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/candidate/portal/login?error=missing_token', req.url));
  }

  const consumed = await consumeLoginToken(token);
  if (!consumed || consumed.subjectType !== 'candidate') {
    return NextResponse.redirect(new URL('/candidate/portal/login?error=invalid_or_expired', req.url));
  }

  const sessionToken = createSessionToken('candidate', consumed.subjectId);
  const response = NextResponse.redirect(new URL('/candidate/portal', req.url));
  response.cookies.set(PORTAL_COOKIE_NAMES.candidate, sessionToken, sessionCookieOptions());
  return response;
}
