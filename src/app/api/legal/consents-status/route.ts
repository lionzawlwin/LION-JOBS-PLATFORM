import { requireTabAccess } from '@/lib/auth';
import { getAgencySettings, getConsentedApplicationIds } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('legal', 'view'))) {
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
