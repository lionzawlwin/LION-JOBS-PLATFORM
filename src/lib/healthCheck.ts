import { Resend } from 'resend';
import { getCronStatus, listSystemEvents } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import type { FailureCategory } from '@/types';

const CRON_SILENCE_HOURS = 36;
const FAILURE_SPIKE_THRESHOLD = 15;
const ROUTE = '/api/cron/job-alerts#health-check';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';

async function checkCronSilence(): Promise<string[]> {
  const statuses = await getCronStatus();
  const problems: string[] = [];
  const knownRoutes = ['/api/cron/job-alerts', '/api/cron/weekly-email'];

  for (const route of knownRoutes) {
    const status = statuses.find((s) => s.route === route);
    if (!status) {
      problems.push(`${route}: has never recorded a run`);
      continue;
    }
    const ageHours = (Date.now() - new Date(status.lastRunAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > CRON_SILENCE_HOURS) {
      problems.push(`${route}: last ran ${ageHours.toFixed(1)}h ago (threshold ${CRON_SILENCE_HOURS}h)`);
    }
  }
  return problems;
}

async function checkFailureSpikes(): Promise<string[]> {
  const events = await listSystemEvents({ days: 1 });
  const counts = new Map<FailureCategory, number>();
  for (const ev of events) {
    counts.set(ev.category, (counts.get(ev.category) ?? 0) + 1);
  }

  const problems: string[] = [];
  for (const [category, count] of counts.entries()) {
    if (count > FAILURE_SPIKE_THRESHOLD) {
      problems.push(`${category}: ${count} failures in the last 24h (threshold ${FAILURE_SPIKE_THRESHOLD})`);
    }
  }
  return problems;
}

// Called once at the end of the daily job-alerts cron (this project's
// Vercel plan caps crons at 2, daily-only, so this piggybacks rather than
// adding a 3rd). Never throws — a health-check failure must not break the
// cron it's riding on.
export async function runHealthCheck(): Promise<void> {
  try {
    const [silenceProblems, spikeProblems] = await Promise.all([
      checkCronSilence(),
      checkFailureSpikes(),
    ]);

    const problems = [...silenceProblems, ...spikeProblems];
    if (problems.length === 0) return;

    const alertEmail = process.env.ALERT_EMAIL;
    const resend = getResend();
    if (!alertEmail || !resend) return;

    await resend.emails.send({
      from:    FROM,
      to:      [alertEmail],
      subject: `Lion Jobs Agency — ${problems.length} health check alert(s)`,
      html:    `<div style="font-family:Arial,Helvetica,sans-serif;padding:24px;">
  <h2>System Health Alert</h2>
  <ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul>
  <p style="color:#888;font-size:12px;">Check the System Health dashboard tab for details.</p>
</div>`,
    });
  } catch (err) {
    await logFailure({
      category: 'cron',
      route:    ROUTE,
      message:  'Health check itself failed',
      error:    err,
    });
  }
}
