import { z } from 'zod';
import { requireTabAccess } from '@/lib/auth';
import { getAgencySettings, updateAgencySettings } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// Same pattern as /api/job-boost-settings, one price point over -- no
// durationDays, unlike Featured Placement/Job Boost, since a contact
// unlock doesn't expire.
const settingsSchema = z.object({
  priceMmk: z.number().min(0),
});

export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getAgencySettings();
  return Response.json({
    priceMmk: settings.contactUnlockPriceMmk,
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'priceMmk must be >= 0.' }, { status: 422 });
  }

  try {
    await updateAgencySettings({ contactUnlockPriceMmk: parsed.data.priceMmk });
    await logAudit({ action: 'update', domain: 'billing', entityType: 'contact_unlock_settings', entityId: 'default' });
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/contact-unlock-settings',
      message:  'Could not update contact unlock settings',
      error:    err,
    });
    return Response.json({ error: 'Could not update settings.' }, { status: 502 });
  }
}
