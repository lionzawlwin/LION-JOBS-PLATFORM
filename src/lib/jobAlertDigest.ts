import { getJobsPaginated, listActiveJobAlertSubscriptions, touchJobAlertSubscriptionSent } from '@/lib/db';
import { sendJobAlertDigestEmail } from '@/lib/portalEmail';
import { logFailure } from '@/lib/observability';
import { formatSalary } from '@/lib/utils';
import type { JobAlertSubscription } from '@/types';

// Job Alert Subscriptions (CTO big-upgrades roadmap, Item #2): daily
// digest for every active saved search. Called from
// /api/cron/job-alerts (piggybacked onto that existing daily invocation,
// same trick runHealthCheck()/runCrmDigest() already use in that route
// to stay within Vercel's Hobby-plan 2-cron-job cap) rather than a new
// cron job.
const ROUTE = '/api/cron/job-alerts#job-alert-digest';
const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

function describeSearch(sub: JobAlertSubscription): string {
  const parts: string[] = [];
  if (sub.keyword)  parts.push(`"${sub.keyword}"`);
  if (sub.category) parts.push(sub.category);
  if (sub.type)     parts.push(sub.type);
  if (sub.location) parts.push(sub.location);
  return parts.length > 0 ? parts.join(' · ') : 'All Jobs';
}

export async function runJobAlertDigest(): Promise<void> {
  // Graceful no-op, same convention as every other Resend-backed function
  // in this repo (see portalEmail.ts) -- a missing key must never fail
  // the cron run itself.
  if (!process.env.RESEND_API_KEY) return;

  const subscriptions = await listActiveJobAlertSubscriptions();
  if (subscriptions.length === 0) return;

  // Same "posted in the last 24h" recency window /api/cron/job-alerts
  // already uses for its Telegram digest -- kept identical here rather
  // than inventing a second recency rule for the same daily cadence.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  for (const sub of subscriptions) {
    try {
      // Reuses getJobsPaginated()'s exact filtering (src/lib/db/jobs.ts)
      // -- no new filtering logic invented for this feature, per 0037's
      // migration comment.
      const { jobs } = await getJobsPaginated({
        keyword:   sub.keyword || undefined,
        category:  sub.category || undefined,
        type:      sub.type || undefined,
        location:  sub.location || undefined,
        salaryMin: sub.salaryMin || undefined,
        limit:     1000,
      });

      const newJobs = jobs.filter((job) => {
        if (!job.postedAt) return false;
        try {
          return new Date(job.postedAt) >= since;
        } catch {
          return false;
        }
      });

      if (newJobs.length === 0) continue;

      await sendJobAlertDigestEmail({
        to:          sub.email,
        searchLabel: describeSearch(sub),
        jobs: newJobs.map((j) => ({
          id:       j.id,
          title:    j.title,
          company:  j.company,
          location: j.location,
          salary:   j.salaryMin > 0 ? formatSalary(j.salaryMin, j.salaryMax, j.currency) : 'Negotiable',
        })),
        unsubscribeUrl: `${SITE_URL}/api/job-alerts/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken)}`,
      });

      await touchJobAlertSubscriptionSent(sub.id);
    } catch (err) {
      // One bad send/query must not stop the rest of the batch -- same
      // per-recipient try/catch shape as weekly-email's cron loop.
      await logFailure({
        category: 'cron',
        route:    ROUTE,
        message:  (err as Error).message,
        context:  { subscriptionId: sub.id },
      });
    }
  }
}
