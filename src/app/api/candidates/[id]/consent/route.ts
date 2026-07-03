import { requireTabAccess } from '@/lib/auth';
import { getConsentForApplication, getApplicationInterviewLocation, getAgencySettings, recordConsent, getCandidatesByEmailOrPhone } from '@/lib/db';
import { getClientIp, checkRateLimit } from '@/lib/apiSecurity';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// Staff-only: read consent status for the Candidate Drawer badge.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('candidates', 'view'))) {
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

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query || query.length < 5) {
    return Response.json({ error: 'A valid email or phone number is required to confirm your identity.' }, { status: 400 });
  }

  // candidate_consents is a legal-evidentiary record — an application id alone
  // (timestamp + a few random chars, not a cryptographic token) must not be
  // enough to fabricate someone else's consent. Require the same email/phone
  // proof that /api/apply/status already uses to surface this application.
  const matches = await getCandidatesByEmailOrPhone(query);
  if (!matches.some((c) => c.id === id)) {
    return Response.json({ error: 'Could not verify this application.' }, { status: 403 });
  }

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
    await logFailure({ category: 'other', route: '/api/candidates/[id]/consent', message: 'Could not record consent', error: err, context: { applicationId: id } });
    return Response.json({ error: 'Could not record consent.' }, { status: 502 });
  }
}
