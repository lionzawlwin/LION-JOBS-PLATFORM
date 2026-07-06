import { getCompanies, getJobs, getCandidates } from '@/lib/db';
import { Resend } from 'resend';
import { buildWeeklyDigestEmail } from '@/lib/emailTemplates';
import { logFailure, logCronSuccess } from '@/lib/observability';
import type { NextRequest } from 'next/server';
import { formatSalary } from '@/lib/utils';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';
const ROUTE = '/api/cron/weekly-email';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      await logCronSuccess(ROUTE, 'RESEND_API_KEY not set, skipped');
      return Response.json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not set' });
    }

    const [companies, jobs, candidates] = await Promise.all([
      getCompanies(),
      getJobs(),
      getCandidates(),
    ]);

    const targets = companies.filter(
      (c) => c.status !== 'Inactive' && c.email,
    );

    if (targets.length === 0) {
      await logCronSuccess(ROUTE, 'No active companies with email');
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
        const result = await resend.emails.send({
          from:    FROM,
          to:      [company.email],
          subject: email.subject,
          html:    email.html,
        });
        // See portalEmail.ts's assertResendSuccess comment -- Resend
        // resolves successfully with { error } on an API-level failure
        // instead of throwing; without this check `sent` would count a
        // failed send as delivered.
        if (result.error) {
          throw new Error(`Resend error (${result.error.name}): ${result.error.message}`);
        }
        sent++;
      } catch (err) {
        errors.push(`${company.name}: ${(err as Error).message}`);
      }
    }

    if (errors.length > 0) {
      await logFailure({
        category: 'cron',
        route:    ROUTE,
        message:  `${errors.length}/${targets.length} recipient sends failed`,
        context:  { sent, total: targets.length, failed: errors.length },
      });
    } else {
      await logCronSuccess(ROUTE, `Sent ${sent}/${targets.length}`);
    }

    return Response.json({ ok: true, sent, total: targets.length, errors });
  } catch (err) {
    await logFailure({ category: 'cron', route: ROUTE, message: (err as Error).message, error: err });
    return Response.json({ error: 'weekly-email cron failed' }, { status: 502 });
  }
}
