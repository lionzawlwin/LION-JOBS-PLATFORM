import { NextResponse } from 'next/server';
import { PORTAL_COOKIE_NAMES } from '@/lib/portalAuth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_COOKIE_NAMES.company, '', { path: '/', maxAge: 0 });
  return response;
}
