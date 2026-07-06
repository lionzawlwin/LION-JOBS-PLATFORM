import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import type { AccountPlan, PlanUsage, CompanyPlanUsageRow } from '@/types';

function mapToAccountPlan(row: Record<string, unknown>): AccountPlan {
  return {
    id:               row.id as string,
    name:             row.name as string,
    jobSlotLimit:     (row.job_slot_limit as number | null) ?? null,
    cseHoursIncluded: (row.cse_hours_included as number | null) ?? null,
    priceMmk:         (row.price_mmk as number | null) ?? null,
  };
}

export async function getAccountPlans(): Promise<AccountPlan[]> {
  const { data, error } = await supabase
    .from('account_plans')
    .select('*')
    .order('job_slot_limit', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('[db/accountPlans] getAccountPlans error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToAccountPlan);
}

async function countJobSlotsUsed(companyId: string): Promise<number> {
  const { count, error } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  if (error) {
    console.error('[db/accountPlans] countJobSlotsUsed error:', error.message);
    return 0;
  }
  return count ?? 0;
}

// Layer 13 (Plan Tiers & Usage Metering). A company with no plan_id (the
// default for every pre-existing account) is unmetered -- this returns
// atCapacity: false unconditionally, preserving today's behavior for any
// account nobody has deliberately put on a plan.
export async function getPlanUsage(companyId: string, planId: string | null): Promise<PlanUsage> {
  const jobSlotsUsed = await countJobSlotsUsed(companyId);

  if (!planId) {
    return { plan: null, jobSlotsUsed, atCapacity: false };
  }

  const { data, error } = await supabase
    .from('account_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  if (error || !data) {
    console.error('[db/accountPlans] getPlanUsage plan lookup error:', error?.message ?? 'plan not found');
    return { plan: null, jobSlotsUsed, atCapacity: false };
  }

  const plan = mapToAccountPlan(data);
  const atCapacity = plan.jobSlotLimit !== null && jobSlotsUsed >= plan.jobSlotLimit;
  return { plan, jobSlotsUsed, atCapacity };
}

// Gate function used before creating a new job listing for a company (see
// the job-requests approval route). Deliberately separate from the RBAC
// hasAccess()/getAccessLevel() in permissions.ts -- plan capacity is a
// monetization concern, not a role/permission one, and the two must not be
// merged into one matrix (Chief Architect's call, see roadmap Layer 13).
export async function hasPlanCapacity(companyId: string, planId: string | null): Promise<boolean> {
  const usage = await getPlanUsage(companyId, planId);
  return !usage.atCapacity;
}

// Cross-account view for the Billing tab's Account Plans panel. Same narrow-
// column, cross-account-aggregate pattern as enterpriseStats.ts/clientHealth.ts
// -- one pass over companies/jobs/account_plans rather than N+1 getPlanUsage()
// calls per company.
async function computePlanUsageSummary(): Promise<CompanyPlanUsageRow[]> {
  const [companiesRes, jobsRes, plansRes] = await Promise.all([
    supabase.from('companies').select('id, name, plan_id').eq('is_internal', false),
    supabase.from('jobs').select('company_id').not('company_id', 'is', null),
    supabase.from('account_plans').select('*'),
  ]);

  if (companiesRes.error) console.error('[db/accountPlans] companies error:', companiesRes.error.message);
  if (jobsRes.error) console.error('[db/accountPlans] jobs error:', jobsRes.error.message);
  if (plansRes.error) console.error('[db/accountPlans] account_plans error:', plansRes.error.message);

  const planById = new Map((plansRes.data ?? []).map((p) => [p.id as string, mapToAccountPlan(p)]));

  const jobCountByCompany = new Map<string, number>();
  for (const row of jobsRes.data ?? []) {
    const companyId = row.company_id as string;
    jobCountByCompany.set(companyId, (jobCountByCompany.get(companyId) ?? 0) + 1);
  }

  return (companiesRes.data ?? []).map((row) => {
    const companyId = row.id as string;
    const planId = (row.plan_id as string | null) ?? null;
    const plan = planId ? (planById.get(planId) ?? null) : null;
    const jobSlotsUsed = jobCountByCompany.get(companyId) ?? 0;
    const atCapacity = plan?.jobSlotLimit != null && jobSlotsUsed >= plan.jobSlotLimit;
    return {
      companyId,
      companyName: row.name as string,
      planId,
      planName: plan?.name ?? null,
      jobSlotLimit: plan?.jobSlotLimit ?? null,
      jobSlotsUsed,
      atCapacity,
    };
  });
}

export const getPlanUsageSummary = unstable_cache(
  computePlanUsageSummary,
  ['plan-usage-summary'],
  { revalidate: 30, tags: ['plan-usage-summary'] },
);
