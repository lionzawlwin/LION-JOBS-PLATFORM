import { supabase } from '@/lib/supabase';
import type { AgencySettings } from '@/types';

const DEFAULTS: AgencySettings = {
  defaultCommissionRatePct:    60,
  defaultGuaranteeDays:        60,
  defaultReplacementCostMmk:   0,
  antiBypassPenaltyMmk:        500000,
  antiBypassRestrictionMonths: 12,
  termsVersion:                'v1',
};

function mapToSettings(row: Record<string, unknown>): AgencySettings {
  return {
    defaultCommissionRatePct:    Number(row.default_commission_rate_pct ?? DEFAULTS.defaultCommissionRatePct),
    defaultGuaranteeDays:        Number(row.default_guarantee_days ?? DEFAULTS.defaultGuaranteeDays),
    defaultReplacementCostMmk:   Number(row.default_replacement_cost_mmk ?? DEFAULTS.defaultReplacementCostMmk),
    antiBypassPenaltyMmk:        Number(row.anti_bypass_penalty_mmk ?? DEFAULTS.antiBypassPenaltyMmk),
    antiBypassRestrictionMonths: Number(row.anti_bypass_restriction_months ?? DEFAULTS.antiBypassRestrictionMonths),
    termsVersion:                (row.terms_version as string) ?? DEFAULTS.termsVersion,
  };
}

export async function getAgencySettings(): Promise<AgencySettings> {
  const { data, error } = await supabase
    .from('agency_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) {
    console.error('[db/legalSettings] getAgencySettings error:', error?.message);
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
}>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.defaultCommissionRatePct    !== undefined) update.default_commission_rate_pct = data.defaultCommissionRatePct;
  if (data.defaultGuaranteeDays        !== undefined) update.default_guarantee_days = data.defaultGuaranteeDays;
  if (data.defaultReplacementCostMmk   !== undefined) update.default_replacement_cost_mmk = data.defaultReplacementCostMmk;
  if (data.antiBypassPenaltyMmk        !== undefined) update.anti_bypass_penalty_mmk = data.antiBypassPenaltyMmk;
  if (data.antiBypassRestrictionMonths !== undefined) update.anti_bypass_restriction_months = data.antiBypassRestrictionMonths;
  if (data.termsVersion                !== undefined) update.terms_version = data.termsVersion;

  const { error } = await supabase.from('agency_settings').update(update).eq('id', 'default');
  if (error) throw new Error(`Failed to update agency settings: ${error.message}`);
}
