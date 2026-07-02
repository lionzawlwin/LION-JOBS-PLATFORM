import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getConsentForApplication, getApplicationInterviewLocation, getAgencySettings, recordConsent } from '@/lib/db';
import { getClientIp, checkRateLimit } from '@/lib/apiSecurity';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

// Admin-only: read consent status for the Candidate Drawer badge.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const consent = await getConsentForApplication(id);
  return Response.json({ consent });
}

// Public: candidate-facing consent submission from the AntiBypassConsentModal.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`candidate-consent:${ip}`, 10, 60);
  if (!rl.allowed) {
    return Response.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  const { id } = await context.params;

  const location = await getApplicationInterviewLocation(id);
  if (!location) {
    return Response.json({ error: 'No interview details available yet for this application.' }, { status: 400 });
  }

  const settings = await getAgencySettings();

  try {
    await recordConsent({
      applicationId: id,
      termsVersion:  settings.termsVersion,
      ipAddress:     ip,
      userAgent:     req.headers.get('user-agent') ?? undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[candidates/consent/post]', err);
    return Response.json({ error: 'Could not record consent.' }, { status: 502 });
  }
}
