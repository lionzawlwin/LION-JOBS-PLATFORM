import { supabase } from '@/lib/supabase';
import type { AgencySettings } from '@/types';

const DEFAULTS: AgencySettings = {
  defaultCommissionRatePct:    60,
  defaultGuaranteeDays:        60,
  defaultReplacementCostMmk:   0,
  antiBypassPenaltyMmk:        500000,
  antiBypassRestrictionMonths: 12,
  termsVersion:                'v1',
  featuredPlacementPriceMmk:      50000,
  featuredPlacementDurationDays:  30,
  jobBoostPriceMmk:               20000,
  jobBoostDurationDays:           14,
  contactUnlockPriceMmk:          5000,
};

function mapToSettings(row: Record<string, unknown>): AgencySettings {
  return {
    defaultCommissionRatePct:    Number(row.default_commission_rate_pct ?? DEFAULTS.defaultCommissionRatePct),
    defaultGuaranteeDays:        Number(row.default_guarantee_days ?? DEFAULTS.defaultGuaranteeDays),
    defaultReplacementCostMmk:   Number(row.default_replacement_cost_mmk ?? DEFAULTS.defaultReplacementCostMmk),
    antiBypassPenaltyMmk:        Number(row.anti_bypass_penalty_mmk ?? DEFAULTS.antiBypassPenaltyMmk),
    antiBypassRestrictionMonths: Number(row.anti_bypass_restriction_months ?? DEFAULTS.antiBypassRestrictionMonths),
    termsVersion:                (row.terms_version as string) ?? DEFAULTS.termsVersion,
    featuredPlacementPriceMmk:     Number(row.featured_placement_price_mmk ?? DEFAULTS.featuredPlacementPriceMmk),
    featuredPlacementDurationDays: Number(row.featured_placement_duration_days ?? DEFAULTS.featuredPlacementDurationDays),
    jobBoostPriceMmk:              Number(row.job_boost_price_mmk ?? DEFAULTS.jobBoostPriceMmk),
    jobBoostDurationDays:          Number(row.job_boost_duration_days ?? DEFAULTS.jobBoostDurationDays),
    contactUnlockPriceMmk:         Number(row.contact_unlock_price_mmk ?? DEFAULTS.contactUnlockPriceMmk),
  };
}

export async function getAgencySettings(): Promise<AgencySettings> {
  const { data, error } = await supabase
    .from('agency_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) {
    console.error('[db/legalSettings] getAgencySettings error:', error?.message ?? 'no row found');
    return DEFAULTS;
  }
  return mapToSettings(data);
}

export async function updateAgencySettings(data: Partial<{
  defaultCommissionRatePct:    number;
  defaultGuaranteeDays:        number;
  defaultReplacementCostMmk:   number;
  antiBypassPenaltyMmk:        number;
  antiBypassRestrictionMonths: number;
  termsVersion:                string;
  featuredPlacementPriceMmk:     number;
  featuredPlacementDurationDays: number;
  jobBoostPriceMmk:              number;
  jobBoostDurationDays:          number;
  contactUnlockPriceMmk:         number;
}>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.defaultCommissionRatePct    !== undefined) update.default_commission_rate_pct = data.defaultCommissionRatePct;
  if (data.defaultGuaranteeDays        !== undefined) update.default_guarantee_days = data.defaultGuaranteeDays;
  if (data.defaultReplacementCostMmk   !== undefined) update.default_replacement_cost_mmk = data.defaultReplacementCostMmk;
  if (data.antiBypassPenaltyMmk        !== undefined) update.anti_bypass_penalty_mmk = data.antiBypassPenaltyMmk;
  if (data.antiBypassRestrictionMonths !== undefined) update.anti_bypass_restriction_months = data.antiBypassRestrictionMonths;
  if (data.termsVersion                !== undefined) update.terms_version = data.termsVersion;
  if (data.featuredPlacementPriceMmk     !== undefined) update.featured_placement_price_mmk = data.featuredPlacementPriceMmk;
  if (data.featuredPlacementDurationDays !== undefined) update.featured_placement_duration_days = data.featuredPlacementDurationDays;
  if (data.jobBoostPriceMmk              !== undefined) update.job_boost_price_mmk = data.jobBoostPriceMmk;
  if (data.jobBoostDurationDays          !== undefined) update.job_boost_duration_days = data.jobBoostDurationDays;
  if (data.contactUnlockPriceMmk         !== undefined) update.contact_unlock_price_mmk = data.contactUnlockPriceMmk;

  const { error } = await supabase.from('agency_settings').update(update).eq('id', 'default');
  if (error) throw new Error(`Failed to update agency settings: ${error.message}`);
}
