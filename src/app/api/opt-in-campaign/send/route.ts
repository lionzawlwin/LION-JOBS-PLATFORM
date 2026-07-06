import { requireTabAccess } from '@/lib/auth';
import { getNextOptInCampaignBatch, markOptInCampaignSent, getOptInCampaignStats } from '@/lib/db';
import { sendDirectContactOptInEmail } from '@/lib/portalEmail';
import { createDirectContactOptInToken } from '@/lib/consentLinks';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

// POST /api/opt-in-campaign/send -- staff-triggered batch send for the
// Fast-Track Visibility opt-in campaign. Deliberately a manual button,
// not a cron: this repo is already at Vercel Hobby's 2-cron cap, and a
// one-off historical backfill doesn't need scheduling anyway -- the
// owner clicks it as many times as needed until the eligible count hits
// zero. Each candidate is only ever marked sent AFTER their email
// actually succeeds, so a failed batch (e.g. Resend not yet configured)
// is safe to retry -- it'll pick up the exact same candidates again,
// never a duplicate send to someone who already got one.
export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requestedBatchSize = (body as Record<string, unknown>)?.batchSize;
  const batchSize = typeof requestedBatchSize === 'number' && requestedBatchSize > 0
    ? Math.min(requestedBatchSize, MAX_BATCH_SIZE)
    : DEFAULT_BATCH_SIZE;

  const batch = await getNextOptInCampaignBatch(batchSize);

  let sent = 0;
  let failed = 0;
  for (const candidate of batch) {
    try {
      const token = createDirectContactOptInToken(candidate.candidateId);
      const optInLink = `${SITE_URL}/api/consent/direct-contact-unlock?token=${encodeURIComponent(token)}`;
      await sendDirectContactOptInEmail({ to: candidate.email, candidateName: candidate.name, optInLink });
      await markOptInCampaignSent(candidate.candidateId);
      sent++;
    } catch (err) {
      failed++;
      await logFailure({
        category: 'other',
        route:    '/api/opt-in-campaign/send',
        message:  'Failed to send Fast-Track Visibility opt-in email',
        error:    err,
        context:  { candidateId: candidate.candidateId },
      });
    }
  }

  if (sent > 0) {
    await logAudit({ action: 'update', domain: 'billing', entityType: 'opt_in_campaign_batch', entityId: `batch-${Date.now()}` });
  }

  const stats = await getOptInCampaignStats();
  return Response.json({ sent, failed, eligible: stats.eligible, totalSent: stats.sent });
}
