const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';
const BRAND    = '#7C3AED'; // brand-600 purple

const baseStyles = `
  body { margin:0; padding:0; background:#f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrapper { max-width:600px; margin:0 auto; padding:24px 16px; }
  .card { background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.08); }
  .header { background:${BRAND}; padding:32px 24px; text-align:center; }
  .header h1 { color:#fff; margin:0; font-size:22px; font-weight:700; }
  .header p  { color:rgba(255,255,255,.85); margin:6px 0 0; font-size:14px; }
  .body { padding:32px 24px; }
  .body h2  { color:#1a1a2e; font-size:18px; margin:0 0 8px; }
  .body p   { color:#555; font-size:14px; line-height:1.6; margin:0 0 16px; }
  .btn { display:inline-block; background:${BRAND}; color:#fff !important; text-decoration:none; padding:12px 28px; border-radius:10px; font-size:14px; font-weight:600; margin:8px 0; }
  .job-card { border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin:12px 0; }
  .job-card h3 { margin:0 0 4px; font-size:15px; color:#1a1a2e; }
  .job-card p  { margin:0; font-size:13px; color:#888; }
  .tag { display:inline-block; background:#f3f4f6; color:#555; padding:3px 10px; border-radius:20px; font-size:12px; margin:2px; }
  .divider { border:none; border-top:1px solid #e5e7eb; margin:24px 0; }
  .footer { padding:20px 24px; background:#f9fafb; text-align:center; font-size:12px; color:#9ca3af; }
`;

export interface JobBrief {
  title:    string;
  company:  string;
  location: string;
  salary:   string;
  id:       string;
}

export function buildWelcomeEmail(data: {
  contactPerson: string;
  companyName:   string;
}): { subject: string; html: string } {
  return {
    subject: `Welcome to Lion Jobs Agency — Let's Find You the Best Talent`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>🦁 Lion Jobs Agency</h1>
      <p>Myanmar's Trusted Recruitment Partner</p>
    </div>
    <div class="body">
      <h2>Welcome, ${data.contactPerson}! 👋</h2>
      <p>Thank you for connecting with <strong>Lion Jobs Agency</strong>. We're thrilled to partner with <strong>${data.companyName}</strong> to find exceptional talent in Myanmar.</p>

      <p>Here's what you can expect from us:</p>
      <p>✅ <strong>Pre-screened candidates</strong> — we only send you the best fits<br>
         ✅ <strong>Fast turnaround</strong> — shortlists within 48 hours<br>
         ✅ <strong>Zero upfront cost</strong> — pay only on successful placement<br>
         ✅ <strong>Ongoing support</strong> — we stay involved throughout onboarding</p>

      <hr class="divider">

      <p>Our current talent pool includes professionals across Engineering, Sales, Marketing, Finance, Healthcare, and more.</p>

      <a href="${SITE_URL}" class="btn">Browse Our Job Board</a>

      <hr class="divider">
      <p style="font-size:13px;color:#888;">To share your job requirements, simply reply to this email or call us directly. We'll take it from there.</p>
    </div>
    <div class="footer">
      Lion Jobs Agency &middot; Myanmar<br>
      <a href="${SITE_URL}" style="color:${BRAND};">${SITE_URL}</a><br><br>
      You received this email because you registered as a hiring partner. <a href="#" style="color:#9ca3af;">Unsubscribe</a>
    </div>
  </div>
</div>
</body></html>`,
  };
}

export function buildWeeklyDigestEmail(data: {
  contactPerson: string;
  companyName:   string;
  jobs:          JobBrief[];
  candidateCount: number;
}): { subject: string; html: string } {
  const jobCards = data.jobs.slice(0, 6).map((j) => `
    <div class="job-card">
      <h3>${j.title}</h3>
      <p>${j.company} &middot; ${j.location}</p>
      <p><span class="tag">💰 ${j.salary}</span></p>
    </div>
  `).join('');

  return {
    subject: `[Lion Jobs Weekly] ${data.jobs.length} New Openings — ${data.candidateCount} Candidates Ready`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>🦁 Weekly Job Digest</h1>
      <p>Your weekly update from Lion Jobs Agency</p>
    </div>
    <div class="body">
      <h2>Good morning, ${data.contactPerson}! ☀️</h2>
      <p>Here's your weekly snapshot from <strong>Lion Jobs Agency</strong>. This week we have <strong>${data.jobs.length} active openings</strong> and <strong>${data.candidateCount} pre-screened candidates</strong> ready to be placed.</p>

      <h2 style="margin-top:24px;">📋 This Week's Active Roles</h2>
      ${jobCards || '<p>No new roles this week — check back soon!</p>'}

      <a href="${SITE_URL}" class="btn">View All Jobs on Lion Jobs</a>

      <hr class="divider">

      <h2>🎯 Looking to Hire?</h2>
      <p>Have a role to fill at <strong>${data.companyName}</strong>? Simply reply to this email with the job title and requirements — we'll have a shortlist for you within 48 hours.</p>

      <p>Our talent pool currently includes candidates in: Engineering, IT, Sales, Marketing, Finance, Customer Service, Healthcare, and more.</p>
    </div>
    <div class="footer">
      Lion Jobs Agency &middot; Myanmar<br>
      <a href="${SITE_URL}" style="color:${BRAND};">${SITE_URL}</a><br><br>
      <a href="#" style="color:#9ca3af;">Unsubscribe</a> from weekly digest
    </div>
  </div>
</div>
</body></html>`,
  };
}

export function buildCandidateAlertEmail(data: {
  contactPerson:  string;
  companyName:    string;
  positionTitle:  string;
  candidateCount: number;
  candidates:     { name: string; skills: string; experience: string }[];
}): { subject: string; html: string } {
  const cards = data.candidates.map((c) => `
    <div class="job-card">
      <h3>👤 ${c.name}</h3>
      <p>🔧 ${c.skills}</p>
      <p>📋 ${c.experience}</p>
    </div>
  `).join('');

  return {
    subject: `We Found ${data.candidateCount} Candidates for "${data.positionTitle}" at ${data.companyName}`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>🎯 Candidate Match Alert</h1>
      <p>We found great candidates for you!</p>
    </div>
    <div class="body">
      <h2>Hi ${data.contactPerson}!</h2>
      <p>Great news! Our team has identified <strong>${data.candidateCount} pre-screened candidate(s)</strong> who match your requirement for <strong>${data.positionTitle}</strong> at <strong>${data.companyName}</strong>.</p>

      <h2 style="margin-top:24px;">👥 Candidate Overview</h2>
      ${cards}

      <hr class="divider">

      <p>To schedule interviews or request full CVs, simply reply to this email or contact our team directly. We'll coordinate everything.</p>

      <a href="mailto:lionzawlwin@gmail.com?subject=Re: Candidates for ${encodeURIComponent(data.positionTitle)}" class="btn">
        Reply to Schedule Interviews
      </a>
    </div>
    <div class="footer">
      Lion Jobs Agency &middot; Myanmar<br>
      <a href="${SITE_URL}" style="color:${BRAND};">${SITE_URL}</a><br><br>
      <a href="#" style="color:#9ca3af;">Unsubscribe</a>
    </div>
  </div>
</div>
</body></html>`,
  };
}

export function buildOutreachEmail(data: {
  contactPerson: string;
  companyName:   string;
  customNote?:   string;
}): { subject: string; html: string } {
  return {
    subject: `Connecting Top Myanmar Talent with ${data.companyName} — Lion Jobs Agency`,
    html: `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head><body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <h1>🦁 Lion Jobs Agency</h1>
      <p>Myanmar's Premier Recruitment Partner</p>
    </div>
    <div class="body">
      <h2>Dear ${data.contactPerson},</h2>
      <p>I hope this email finds you well. I'm reaching out from <strong>Lion Jobs Agency</strong>, Myanmar's leading recruitment firm specialising in connecting top talent with forward-thinking companies.</p>

      ${data.customNote ? `<p>${data.customNote}</p>` : ''}

      <p>We've recently helped companies like yours fill critical roles across:</p>
      <p>
        <span class="tag">💻 Engineering & IT</span>
        <span class="tag">📢 Sales & Marketing</span>
        <span class="tag">💰 Finance & Accounting</span>
        <span class="tag">🏥 Healthcare</span>
        <span class="tag">⚙️ Operations</span>
      </p>

      <hr class="divider">

      <h2>Why Lion Jobs Agency?</h2>
      <p>✅ <strong>Pre-screened candidates only</strong><br>
         ✅ <strong>48-hour shortlist turnaround</strong><br>
         ✅ <strong>100% success-based</strong> — no upfront fees<br>
         ✅ <strong>Myanmar-specific expertise</strong></p>

      <p>Would you be open to a brief 15-minute call this week to discuss any upcoming hiring needs at <strong>${data.companyName}</strong>?</p>

      <a href="mailto:lionzawlwin@gmail.com?subject=Hiring enquiry from ${encodeURIComponent(data.companyName)}" class="btn">
        Let's Connect
      </a>
    </div>
    <div class="footer">
      Lion Jobs Agency &middot; Myanmar<br>
      <a href="${SITE_URL}" style="color:${BRAND};">${SITE_URL}</a><br><br>
      <a href="#" style="color:#9ca3af;">Unsubscribe</a>
    </div>
  </div>
</div>
</body></html>`,
  };
}

export type EmailTemplateType = 'welcome' | 'weekly_digest' | 'candidate_alert' | 'outreach';
