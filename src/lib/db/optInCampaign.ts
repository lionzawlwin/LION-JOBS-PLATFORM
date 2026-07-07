import { supabase } from '@/lib/supabase';
import { getDirectContactConsentedApplicationIds } from '@/lib/db/consents';

// Fast-Track Visibility opt-in campaign (2026-07-07): a one-time backfill
// email to historical candidates who applied before the Direct-Contact-
// Info Upsell Tier's consent checkbox existed. Deliberately a
// staff-triggered batch action, not a new cron -- this repo is already at
// Vercel Hobby's 2-cron cap (see healthCheck.ts's own comment on that),
// and a one-off backfill doesn't need to be scheduled anyway.
//
// Eligibility is computed in two plain queries + an in-memory join/filter
// rather than one correlated-subquery SQL statement -- this repo's actual
// data volume (a handful of candidates, not millions) makes that the
// simpler, more auditable choice over reaching for a Postgres function
// the rest of this codebase doesn't otherwise use.

export interface OptInCampaignCandidate {
  candidateId: string;
  name:        string;
  email:       string;
}

interface CandidateRow {
  id:                                    string;
  full_name:                             string;
  email:                                 string | null;
  direct_contact_optin_campaign_sent_at: string | null;
}

async function getEligibleCandidates(): Promise<OptInCampaignCandidate[]> {
  const [candidatesResult, appsResult] = await Promise.all([
    supabase
      .from('candidates')
      .select('id, full_name, email, direct_contact_optin_campaign_sent_at')
      .not('email', 'is', null)
      .is('direct_contact_optin_campaign_sent_at', null),
    supabase.from('applications').select('id, candidate_id'),
  ]);

  if (candidatesResult.error || appsResult.error) {
    console.error(
      '[db/optInCampaign] getEligibleCandidates error:',
      candidatesResult.error?.message ?? appsResult.error?.message,
    );
    return [];
  }

  const candidates = (candidatesResult.data ?? []) as CandidateRow[];
  const apps = appsResult.data ?? [];
  if (candidates.length === 0 || apps.length === 0) return [];

  const allApplicationIds = apps.map((a) => a.id as string);
  const consentedApplicationIds = await getDirectContactConsentedApplicationIds(allApplicationIds);

  const applicationIdsByCandidate = new Map<string, string[]>();
  for (const app of apps) {
    const candidateId = app.candidate_id as string;
    const list = applicationIdsByCandidate.get(candidateId) ?? [];
    list.push(app.id as string);
    applicationIdsByCandidate.set(candidateId, list);
  }

  return candidates
    .filter((c) => {
      const theirApplicationIds = applicationIdsByCandidate.get(c.id) ?? [];
      // Only eligible if they have at least one application that isn't
      // already consented -- a candidate fully covered by earlier
      // consent (e.g. every application already opted in some other way)
      // doesn't need this backfill email.
      return theirApplicationIds.some((id) => !consentedApplicationIds.has(id));
    })
    .map((c) => ({ candidateId: c.id, name: c.full_name, email: c.email as string }));
}

export async function getOptInCampaignStats(): Promise<{ eligible: number; sent: number }> {
  const [eligible, sentResult] = await Promise.all([
    getEligibleCandidates(),
    supabase
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .not('direct_contact_optin_campaign_sent_at', 'is', null),
  ]);
  return { eligible: eligible.length, sent: sentResult.count ?? 0 };
}

export async function getNextOptInCampaignBatch(limit: number): Promise<OptInCampaignCandidate[]> {
  const eligible = await getEligibleCandidates();
  return eligible.slice(0, limit);
}

export async function markOptInCampaignSent(candidateId: string): Promise<void> {
  const { error } = await supabase
    .from('candidates')
    .update({ direct_contact_optin_campaign_sent_at: new Date().toISOString() })
    .eq('id', candidateId);
  if (error) throw new Error(`Failed to mark opt-in campaign sent: ${error.message}`);
}
