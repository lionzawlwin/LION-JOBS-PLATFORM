import { Resend } from 'resend';
import { buildJobAlertDigestEmail, type JobBrief } from '@/lib/emailTemplates';
import type { ApplicationStatus } from '@/types';

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

// CTO overnight roadmap session (2026-07-07): notify a candidate when
// their application moves to a meaningful stage. Deliberately only
// Shortlisted/Interview/Hired -- "Applied" is redundant with the
// confirmation the candidate already gets from submitting the form
// themselves. Same graceful-no-op pattern as every other function here:
// a missing RESEND_API_KEY (or any send failure) must never block the
// stage-change action itself; the caller wraps this in try/catch.
export async function sendCandidateStageChangeEmail(opts: {
  to: string;
  candidateName: string;
  jobTitle: string;
  stage: Extract<ApplicationStatus, 'Shortlisted' | 'Interview' | 'Hired'>;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[portalEmail] RESEND_API_KEY not set — cannot send stage-change email.');
    return;
  }

  const COPY: Record<typeof opts.stage, { subject: string; body: string }> = {
    Shortlisted: {
      subject: `You've been shortlisted for ${opts.jobTitle}`,
      body: `<p>Good news -- you've been shortlisted for the <strong>${opts.jobTitle}</strong> position. Our team will be in touch about next steps.</p>`,
    },
    Interview: {
      subject: `Interview stage: ${opts.jobTitle}`,
      body: `<p>Your application for <strong>${opts.jobTitle}</strong> has moved to the interview stage. Our team will contact you shortly with scheduling details.</p>`,
    },
    Hired: {
      subject: `Congratulations! ${opts.jobTitle}`,
      body: `<p>Congratulations, ${opts.candidateName} -- you've been selected for the <strong>${opts.jobTitle}</strong> position! Our team will follow up with onboarding details.</p>`,
    },
  };
  const { subject, body } = COPY[opts.stage];

  const result = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject,
    html: `
      <p>Hi ${opts.candidateName},</p>
      ${body}
      <p>You can track your application status any time at <a href="${SITE_URL}/my-applications">My Applications</a>.</p>
    `,
  });
  assertResendSuccess(result);
}

// Fast-Track Visibility opt-in campaign (2026-07-07): a one-time backfill
// email to candidates who applied before the Direct-Contact-Info Upsell
// Tier's consent checkbox existed on the application form. The magic
// link is a signed, stateless token (src/lib/consentLinks.ts) -- clicking
// it grants consent for every application of theirs that doesn't already
// have it, in one action, via GET /api/consent/direct-contact-unlock.
export async function sendDirectContactOptInEmail(opts: {
  to: string;
  candidateName: string;
  optInLink: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[portalEmail] RESEND_API_KEY not set — cannot send direct-contact opt-in email.');
    return;
  }

  const result = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'New: get contacted faster by employers (optional)',
    html: `
      <p>Hi ${opts.candidateName},</p>
      <p>We've launched <strong>Fast-Track Visibility</strong> -- employers can now pay a small fee to unlock your
      direct phone number and email so they can reach you faster, instead of always going through us first.</p>
      <p>This is completely optional. Lion Jobs Agency still handles your application either way, and this
      never changes how we work with you -- it just gives employers a faster way to reach you if you'd like that.</p>
      <p><a href="${opts.optInLink}">Click here to opt in</a> if you'd like employers to be able to unlock your
      direct contact info. If you'd rather not, you don't need to do anything -- your information stays exactly
      as private as it is today.</p>
    `,
  });
  assertResendSuccess(result);
}

// Job Alert Subscriptions (CTO big-upgrades roadmap, Item #2): the daily
// digest for one saved search, sent from runJobAlertDigest()
// (src/lib/jobAlertDigest.ts), which is itself piggybacked onto the
// existing daily /api/cron/job-alerts invocation rather than a new cron
// job (Vercel Hobby-plan 2-cron-job cap). Same graceful-no-op pattern as
// every other function here -- a missing RESEND_API_KEY (or any send
// failure) must never block the digest loop itself; the caller wraps
// this in try/catch per-subscription so one bad send doesn't stop the
// rest of the batch.
export async function sendJobAlertDigestEmail(opts: {
  to: string;
  searchLabel: string;
  jobs: JobBrief[];
  unsubscribeUrl: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[portalEmail] RESEND_API_KEY not set — cannot send job alert digest email.');
    return;
  }

  const email = buildJobAlertDigestEmail({
    searchLabel: opts.searchLabel,
    jobs: opts.jobs,
    unsubscribeUrl: opts.unsubscribeUrl,
  });

  const result = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: email.subject,
    html: email.html,
  });
  assertResendSuccess(result);
}
