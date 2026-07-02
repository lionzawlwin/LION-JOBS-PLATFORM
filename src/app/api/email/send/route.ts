import { requireStaff } from '@/lib/auth';
import { Resend } from 'resend';
import {
  buildWelcomeEmail,
  buildWeeklyDigestEmail,
  buildCandidateAlertEmail,
  buildOutreachEmail,
} from '@/lib/emailTemplates';
import type { NextRequest } from 'next/server';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

// Use a verified domain in RESEND_FROM_EMAIL (Vercel env var).
// Falls back to Resend's shared test domain so emails actually deliver during setup.
const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, to, data: templateData, customBody } = body as {
    type:          string;
    to:            string | string[];
    data:          Record<string, unknown>;
    customBody?:   string;
  };

  if (!type || !to) {
    return Response.json({ error: 'type and to are required.' }, { status: 422 });
  }

  const SUBJECTS: Record<string, string> = {
    welcome:      'Welcome to Lion Jobs Agency Partnership',
    outreach:     'Recruitment Partnership Opportunity — Lion Jobs Agency',
    weekly_digest:'Weekly Job Market Update from Lion Jobs Agency',
  };

  let email: { subject: string; html: string } | null = null;

  if (customBody) {
    const escaped = String(customBody)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    email = {
      subject: SUBJECTS[type] ?? 'Message from Lion Jobs Agency',
      html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;color:#1a1a2e;background:#fff;">
  <div style="white-space:pre-wrap;line-height:1.75;font-size:14px;">${escaped}</div>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />
  <p style="font-size:11px;color:#9ca3af;margin:0;">Lion Jobs Agency &middot; Myanmar&rsquo;s Premier Recruitment Firm</p>
</div>`,
    };
  } else if (type === 'welcome') {
    email = buildWelcomeEmail({
      contactPerson: String(templateData.contactPerson ?? 'there'),
      companyName:   String(templateData.companyName   ?? ''),
    });
  } else if (type === 'weekly_digest') {
    email = buildWeeklyDigestEmail({
      contactPerson:  String(templateData.contactPerson ?? 'there'),
      companyName:    String(templateData.companyName   ?? ''),
      jobs:           (templateData.jobs  as never[]) ?? [],
      candidateCount: Number(templateData.candidateCount ?? 0),
    });
  } else if (type === 'candidate_alert') {
    email = buildCandidateAlertEmail({
      contactPerson:  String(templateData.contactPerson ?? 'there'),
      companyName:    String(templateData.companyName   ?? ''),
      positionTitle:  String(templateData.positionTitle ?? ''),
      candidateCount: Number(templateData.candidateCount ?? 0),
      candidates:     (templateData.candidates as never[]) ?? [],
    });
  } else if (type === 'outreach') {
    email = buildOutreachEmail({
      contactPerson: String(templateData.contactPerson ?? 'there'),
      companyName:   String(templateData.companyName   ?? ''),
      customNote:    templateData.customNote ? String(templateData.customNote) : undefined,
    });
  } else {
    return Response.json({ error: `Unknown email type: ${type}` }, { status: 422 });
  }

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from:    FROM,
      to:      Array.isArray(to) ? to : [to],
      subject: email.subject,
      html:    email.html,
    });
    console.log(`[email] Sent ${type} to ${to}:`, result);
    return Response.json({ ok: true, id: result.data?.id });
  } catch (err) {
    console.error('[email] Resend error:', err);
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
