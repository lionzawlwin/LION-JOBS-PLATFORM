import { z } from 'zod';
import { requireTabAccess } from '@/lib/auth';
import { getAgencySettings, updateAgencySettings } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// Thin, 'billing'-scoped slice of the wider agency_settings singleton row
// (see /api/legal/settings, which owns the same table under 'legal'
// access) -- Featured Placement pricing is a commercial/billing concern,
// not a legal one, so it gets its own access-scoped route rather than
// reusing the legal route's requireTabAccess('legal', ...) gate.
const settingsSchema = z.object({
  priceMmk:     z.number().min(0),
  durationDays: z.number().int().min(1),
}).partial();

export async function GET() {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getAgencySettings();
  return Response.json({
    priceMmk:     settings.featuredPlacementPriceMmk,
    durationDays: settings.featuredPlacementDurationDays,
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
    return Response.json({ error: 'priceMmk must be >= 0 and durationDays must be a positive integer.' }, { status: 422 });
  }

  try {
    await updateAgencySettings({
      featuredPlacementPriceMmk:     parsed.data.priceMmk,
      featuredPlacementDurationDays: parsed.data.durationDays,
    });
    await logAudit({ action: 'update', domain: 'billing', entityType: 'featured_placement_settings', entityId: 'default' });
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/featured-placement-settings',
      message:  'Could not update featured placement settings',
      error:    err,
    });
    return Response.json({ error: 'Could not update settings.' }, { status: 502 });
  }
}
