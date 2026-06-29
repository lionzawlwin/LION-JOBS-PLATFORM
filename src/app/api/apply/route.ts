import { z } from 'zod';
import { forwardToMake } from '@/lib/makeWebhook';
import { appendCandidate } from '@/lib/sheets';
import type { NextRequest } from 'next/server';

const applySchema = z
  .object({
    fullName:    z.string().min(2),
    email:       z.string().email().optional(),
    phone:       z.string().min(7),
    position:    z.string().min(2),
    jobId:       z.string().optional(),
    mode:        z.enum(['cv', 'linkedin']),
    cvBase64:    z.string().optional(),
    cvFileName:  z.string().optional(),
    linkedinUrl: z.string().url().optional(),
  })
  .refine(
    (d) =>
      d.mode === 'cv'
        ? Boolean(d.cvBase64 && d.cvFileName)
        : Boolean(d.linkedinUrl),
    { message: 'Provide either a CV or a LinkedIn URL.' },
  );

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    return Response.json({ error: message }, { status: 422 });
  }

  const { fullName, email, phone, position, jobId, cvBase64, cvFileName, linkedinUrl } = parsed.data;

  // ── 1. Write directly to Google Sheets Pipeline tab ──────────────
  // This is the primary persistence path. Make.com is secondary (notifications/CV storage).
  try {
    await appendCandidate({ fullName, email, phone, position, jobId, linkedinUrl, cvFileName });
    console.log(`[apply] Candidate "${fullName}" appended to Pipeline sheet.`);
  } catch (err) {
    // Log full error server-side — this is the most important failure to surface.
    console.error('[apply] CRITICAL — Google Sheets append failed:', err);
    console.error('[apply] Candidate data that failed to save:', {
      fullName, email, phone, position, jobId,
    });
    // Return 502 so the client knows the submission did not save.
    return Response.json(
      { error: 'Could not save your application. Please try again or contact us directly.' },
      { status: 502 },
    );
  }

  // ── 2. Forward to Make.com (CV storage / email confirmation) ──────
  // Non-critical: if Make.com is down or unconfigured we still return success
  // because the data is already in Google Sheets.
  try {
    await forwardToMake({
      fullName, email, phone, position, jobId, cvBase64, cvFileName, linkedinUrl,
      // Fields Make.com uses to route & send the confirmation email
      event:                'application_submitted',
      applicationStatus:    'Under Review',
      confirmationEmailTo:  email ?? null,
      confirmationMessage:  'Your application is being reviewed. Our team will contact you within 48 hours.',
    } as Parameters<typeof forwardToMake>[0] & Record<string, unknown>);
  } catch (err) {
    console.error('[apply] Make.com webhook error (non-critical — sheet write succeeded):', err);
    // Intentionally NOT returning an error response here.
  }

  return Response.json({ ok: true, confirmationSent: Boolean(email) });
}
