import { NextResponse } from 'next/server';
import { PORTAL_COOKIE_NAMES } from '@/lib/portalAuth';

// PUBLIC ROUTE: clearing a session cookie needs no auth check -- there's
// nothing sensitive to gate, and requiring a valid session just to log
// out would be counterproductive.
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE_NAMES.candidate, '', { path: '/', maxAge: 0 });
  return response;
}
