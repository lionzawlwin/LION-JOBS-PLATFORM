import { getCompanies, getJobs, getCandidates } from '@/lib/sheets';
import { Resend } from 'resend';
import { buildWeeklyDigestEmail } from '@/lib/emailTemplates';
import type { NextRequest } from 'next/server';
import { formatSalary } from '@/lib/utils';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';

export async function GET(req: NextRequest) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return Response.json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not set' });
  }

  const [companies, jobs, candidates] = await Promise.all([
    getCompanies(),
    getJobs(),
    getCandidates(),
  ]);

  // Only send to active clients/leads with an email
  const targets = companies.filter(
    (c) => c.status !== 'Inactive' && c.email,
  );

  if (targets.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: 'No active companies with email' });
  }

  const jobBriefs = jobs.slice(0, 6).map((j) => ({
    title:    j.title,
    company:  j.company,
    location: j.location,
    salary:   j.salaryMin > 0 ? formatSalary(j.salaryMin, j.salaryMax, j.currency) : 'Negotiable',
    id:       j.id,
  }));

  const resend = new Resend(resendKey);
  let sent = 0;
  const errors: string[] = [];

  for (const company of targets) {
    try {
      const email = buildWeeklyDigestEmail({
        contactPerson:  company.contactPerson || company.name,
        companyName:    company.name,
        jobs:           jobBriefs,
        candidateCount: candidates.length,
      });
      await resend.emails.send({
        from:    FROM,
        to:      [company.email],
        subject: email.subject,
        html:    email.html,
      });
      sent++;
    } catch (err) {
      errors.push(`${company.name}: ${(err as Error).message}`);
    }
  }

  console.log(`[cron/weekly-email] Sent ${sent}/${targets.length}`, errors);
  return Response.json({ ok: true, sent, total: targets.length, errors });
}
