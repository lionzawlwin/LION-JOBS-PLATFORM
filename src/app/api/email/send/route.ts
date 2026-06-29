import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { Resend } from 'resend';
import {
  buildWelcomeEmail,
  buildWeeklyDigestEmail,
  buildCandidateAlertEmail,
  buildOutreachEmail,
} from '@/lib/emailTemplates';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, to, data: templateData } = body as {
    type:         string;
    to:           string | string[];
    data:         Record<string, unknown>;
  };

  if (!type || !to) {
    return Response.json({ error: 'type and to are required.' }, { status: 422 });
  }

  let email: { subject: string; html: string } | null = null;

  if (type === 'welcome') {
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
