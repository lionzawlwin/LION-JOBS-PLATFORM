import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';
const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

export async function sendPortalLoginEmail(opts: {
  to: string;
  verifyApiPath: '/api/company-portal/verify' | '/api/candidate-portal/verify';
  token: string;
  label: string; // e.g. "Company Portal" / "Candidate Portal"
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[portalEmail] RESEND_API_KEY not set — cannot send portal login email.');
    return;
  }

  const link = `${SITE_URL}${opts.verifyApiPath}?token=${encodeURIComponent(opts.token)}`;

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your ${opts.label} sign-in link`,
    html: `
      <p>Click the link below to sign in to your ${opts.label}. This link expires in 15 minutes and can only be used once.</p>
      <p><a href="${link}">Sign in to ${opts.label}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
