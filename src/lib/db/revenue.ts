import { supabase } from '@/lib/supabase';
import type { RevenueSummary, InvoiceChargeType } from '@/types';
import { listPlanUpgradeRequests, listFeaturedPlacementRequests, listJobBoostRequests } from './systemEvents';

// Commercial/Revenue Overview (Billing tab). Every figure here is derived
// from data that already exists for other reasons (Paid invoices, the
// is_featured flags, the three pending-request inboxes) -- this is a
// read-only aggregation, not a new source of truth. Paid-invoice totals
// are bucketed by product line via invoices.charge_type (migration 0033) --
// previously this parsed a tag back out of Invoice.position, since
// invoices had no `type` column.
export async function getRevenueSummary(): Promise<RevenueSummary> {
  const [invoicesResult, featuredCountResult, boostedCountResult, planUpgradeRequests, featuredPlacementRequests, jobBoostRequests] = await Promise.all([
    supabase.from('invoices').select('charge_type, commission_fee_mmk').eq('status', 'Paid'),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_featured', true),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('is_featured', true),
    listPlanUpgradeRequests(),
    listFeaturedPlacementRequests(),
    listJobBoostRequests(),
  ]);

  if (invoicesResult.error) {
    console.error('[db/revenue] getRevenueSummary invoices error:', invoicesResult.error.message);
  }
  if (featuredCountResult.error) {
    console.error('[db/revenue] getRevenueSummary featured companies count error:', featuredCountResult.error.message);
  }
  if (boostedCountResult.error) {
    console.error('[db/revenue] getRevenueSummary boosted jobs count error:', boostedCountResult.error.message);
  }

  const byLine = {
    candidatePlacementMmk: 0,
    planUpgradeMmk:        0,
    featuredPlacementMmk:  0,
    jobBoostMmk:           0,
  };

  for (const row of invoicesResult.data ?? []) {
    const chargeType = (row.charge_type as InvoiceChargeType) ?? 'candidate_placement';
    const fee = Number(row.commission_fee_mmk) || 0;

    if (chargeType === 'job_boost') {
      byLine.jobBoostMmk += fee;
    } else if (chargeType === 'featured_placement') {
      byLine.featuredPlacementMmk += fee;
    } else if (chargeType === 'plan_upgrade') {
      byLine.planUpgradeMmk += fee;
    } else {
      byLine.candidatePlacementMmk += fee;
    }
  }

  const totalPaidMmk = byLine.candidatePlacementMmk + byLine.planUpgradeMmk + byLine.featuredPlacementMmk + byLine.jobBoostMmk;

  return {
    totalPaidMmk,
    byLine,
    activeFeaturedCompanies: featuredCountResult.count ?? 0,
    activeBoostedJobs:       boostedCountResult.count ?? 0,
    pendingRequests: {
      planUpgrade:       planUpgradeRequests.length,
      featuredPlacement: featuredPlacementRequests.length,
      jobBoost:          jobBoostRequests.length,
    },
  };
}
