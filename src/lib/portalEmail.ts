import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';
const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

// The Resend SDK does NOT throw on an API-level failure (invalid/
// unverified from-address, restricted API key, rate limit, etc.) --
// .emails.send() resolves successfully with { data: null, error: {...} }
// instead. Every call site in this file used to `await` the send and
// ignore that return value entirely, so a real Resend error was silently
// swallowed: the promise "succeeded," the caller's own try/catch never
// fired, and nothing ever reached logFailure/system_events. Confirmed
// live -- portal_login_tokens rows were being created (the app logic runs
// fine) with zero system_events rows for the send step, exactly what this
// bug produces. This turns that silent failure into a thrown Error so
// every caller's existing try/catch (all of them already wrap these
// functions per each function's own doc comment) actually logs it.
function assertResendSuccess(result: { error: { message: string; name: string } | null }): void {
  if (result.error) {
    throw new Error(`Resend error (${result.error.name}): ${result.error.message}`);
  }
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

  const result = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `Your ${opts.label} sign-in link`,
    html: `
      <p>Click the link below to sign in to your ${opts.label}. This link expires in 15 minutes and can only be used once.</p>
      <p><a href="${link}">Sign in to ${opts.label}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
  assertResendSuccess(result);
}

// Layer 3 of the Company Dashboard roadmap: notify a company contact when
// a new invoice is issued against their account. Same graceful-no-op
// pattern as sendPortalLoginEmail -- a missing RESEND_API_KEY (or any
// send failure) must never block invoice creation itself, so callers
// should wrap this in try/catch and treat it as best-effort.
export async function sendInvoiceIssuedEmail(opts: {
  to: string;
  companyName: string;
  invoiceNumber: string;
  position: string;
  commissionFeeMmk: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[portalEmail] RESEND_API_KEY not set — cannot send invoice-issued email.');
    return;
  }

  const result = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: `New invoice ${opts.invoiceNumber} for ${opts.position}`,
    html: `
      <p>Hi ${opts.companyName},</p>
      <p>A new invoice has been issued for the <strong>${opts.position}</strong> placement:</p>
      <ul>
        <li>Invoice: ${opts.invoiceNumber}</li>
        <li>Fee: ${opts.commissionFeeMmk.toLocaleString()} MMK</li>
      </ul>
      <p>You can view this and all your invoices any time in your <a href="${SITE_URL}/company/portal">Company Portal</a>.</p>
    `,
  });
  assertResendSuccess(result);
}

// Layer 4 of the Company Dashboard roadmap: notify a company contact when
// staff approve or reject their portal-submitted job request. Same
// graceful-no-op pattern as the other portal emails -- a missing
// RESEND_API_KEY (or any send failure) must never block the approve/reject
// action itself; callers wrap this in try/catch and treat it as best-effort.
export async function sendJobRequestDecisionEmail(opts: {
  to: string;
  companyName: string;
  title: string;
  decision: 'approved' | 'rejected';
  jobUrl?: string;
  rejectionNote?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[portalEmail] RESEND_API_KEY not set — cannot send job request decision email.');
    return;
  }

  const isApproved = opts.decision === 'approved';
  const subject = isApproved
    ? `Your job request "${opts.title}" is now live`
    : `Update on your job request "${opts.title}"`;

  const html = isApproved
    ? `
      <p>Hi ${opts.companyName},</p>
      <p>Your job request for <strong>${opts.title}</strong> has been approved and is now live on the job board.</p>
      <p><a href="${opts.jobUrl ?? SITE_URL}">View the live listing</a></p>
      <p>You can track it any time in your <a href="${SITE_URL}/company/portal">Company Portal</a>.</p>
    `
    : `
      <p>Hi ${opts.companyName},</p>
      <p>Your job request for <strong>${opts.title}</strong> was not approved.</p>
      <p><strong>Reason:</strong> ${opts.rejectionNote ?? 'No reason provided.'}</p>
      <p>You can submit a revised request any time in your <a href="${SITE_URL}/company/portal">Company Portal</a>.</p>
    `;

  const result = await resend.emails.send({ from: FROM, to: opts.to, subject, html });
  assertResendSuccess(result);
}
