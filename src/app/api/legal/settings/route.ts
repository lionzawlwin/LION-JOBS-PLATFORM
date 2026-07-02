import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getAgencySettings, updateAgencySettings } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

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
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
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
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[legal/settings/patch]', err);
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
