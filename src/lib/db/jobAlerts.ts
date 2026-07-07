import { randomBytes } from 'node:crypto';
import { supabase } from '@/lib/supabase';
import type { JobAlertSubscription, JobCategory, JobType } from '@/types';

function mapToJobAlertSubscription(row: Record<string, unknown>): JobAlertSubscription {
  return {
    id:               row.id as string,
    email:            row.email as string,
    keyword:          (row.keyword as string | null) ?? null,
    category:         (row.category as JobCategory | '' | null) ?? null,
    type:             (row.type as JobType | '' | null) ?? null,
    location:         (row.location as string | null) ?? null,
    salaryMin:        (row.salary_min as number | null) ?? null,
    unsubscribeToken: row.unsubscribe_token as string,
    active:           row.active as boolean,
    lastSentAt:       (row.last_sent_at as string | null) ?? null,
    createdAt:        row.created_at as string,
  };
}

// Search criteria mirrors getJobsPaginated()'s GetJobsPaginatedOptions
// exactly (src/lib/db/jobs.ts) minus salaryMax -- no new filtering shape
// invented, this is what the daily digest (src/lib/jobAlertDigest.ts)
// passes straight through to that function.
export async function createJobAlertSubscription(data: {
  email:     string;
  keyword?:  string;
  category?: string;
  type?:     string;
  location?: string;
  salaryMin?: number;
}): Promise<JobAlertSubscription> {
  const id = `jas-${crypto.randomUUID()}`;
  const unsubscribeToken = randomBytes(24).toString('hex');

  const { data: row, error } = await supabase
    .from('job_alert_subscriptions')
    .insert({
      id,
      email:             data.email,
      keyword:           data.keyword || null,
      category:          data.category || null,
      type:              data.type || null,
      location:          data.location || null,
      salary_min:        data.salaryMin || null,
      unsubscribe_token: unsubscribeToken,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save job alert subscription: ${error.message}`);
  return mapToJobAlertSubscription(row);
}

// Used by the daily digest cron (piggybacked onto /api/cron/job-alerts,
// same Vercel Hobby-plan 2-cron-job-cap trick as runHealthCheck()/
// runCrmDigest() already use in that route).
export async function listActiveJobAlertSubscriptions(): Promise<JobAlertSubscription[]> {
  const { data, error } = await supabase
    .from('job_alert_subscriptions')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[db/jobAlerts] listActiveJobAlertSubscriptions error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToJobAlertSubscription);
}

// Deactivates by the opaque token emailed in every digest's unsubscribe
// link. Returns false for an unknown or already-inactive token so the
// caller can distinguish "nothing changed" (already unsubscribed, or a
// bad/expired token) from a real success -- deliberately not an error,
// since either case is a perfectly normal thing to hit twice (e.g. a
// mail client prefetching the link, or a user clicking it again).
export async function deactivateJobAlertSubscriptionByToken(token: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('job_alert_subscriptions')
    .update({ active: false })
    .eq('unsubscribe_token', token)
    .eq('active', true)
    .select('id');

  if (error) throw new Error(`Failed to unsubscribe job alert: ${error.message}`);
  return (data ?? []).length > 0;
}

// Marks a subscription as sent-to just now, so System Health / a future
// "last sent" UI has something to show. Not used to decide *which* jobs
// are new -- that's still the same "posted in the last 24h" window
// /api/cron/job-alerts already uses for its Telegram digest, kept
// identical here rather than inventing a second recency rule.
export async function touchJobAlertSubscriptionSent(id: string): Promise<void> {
  const { error } = await supabase
    .from('job_alert_subscriptions')
    .update({ last_sent_at: new Date().toISOString() })
    .eq('id', id);

  if (error) console.error('[db/jobAlerts] touchJobAlertSubscriptionSent error:', error.message);
}
