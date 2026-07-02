import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getAgencySettings, getConsentedApplicationIds } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { applicationIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids = body.applicationIds ?? [];
  const settings = await getAgencySettings();
  const consented = await getConsentedApplicationIds(ids, settings.termsVersion);
  return Response.json({ consented: Array.from(consented) });
}
