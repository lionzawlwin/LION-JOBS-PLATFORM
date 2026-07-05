import { z } from 'zod';
import { requireTabAccess } from '@/lib/auth';
import { getAgencySettings, updateAgencySettings } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

// Business/legal terms — keep loose but sane so a fat-fingered admin edit
// can't silently persist a nonsensical commission rate or penalty amount.
const settingsSchema = z.object({
  defaultCommissionRatePct:    z.number().min(0).max(100),
  defaultGuaranteeDays:        z.number().int().min(0),
  defaultReplacementCostMmk:   z.number().min(0),
  antiBypassPenaltyMmk:        z.number().min(0),
  antiBypassRestrictionMonths: z.number().int().min(0),
  termsVersion:                z.string().min(1),
}).partial();

export async function GET() {
  const settings = await getAgencySettings();
  return Response.json(settings);
}

export async function PATCH(req: NextRequest) {
  if (!(await requireTabAccess('legal', 'manage'))) {
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
    return Response.json({ error: 'Invalid settings value.' }, { status: 422 });
  }

  try {
    await updateAgencySettings(parsed.data);
    await logAudit({ action: 'update', domain: 'legal', entityType: 'agency_settings', entityId: 'default' });
    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/legal/settings', message: 'Could not update agency settings', error: err });
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
