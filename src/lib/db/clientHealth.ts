import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { computeHealthBand } from '@/lib/clientHealth';
import type { ClientHealthSummary, HealthBand, CompanyStatus } from '@/types';

// Layer 11 (Client Health Score). Mirrors enterpriseStats.ts's shape and
// caching strategy deliberately -- same unstable_cache/tag pattern, same
// narrow-column bypass of getCompanies()/getInteractions()/getContracts()
// (those return full mapped rows per-account; this needs one cross-account
// pass over a handful of columns).
async function computeClientHealthSummary(): Promise<ClientHealthSummary> {
  const [companiesRes, interactionsRes, contractsRes] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, status, last_contacted')
      .eq('is_internal', false)
      .in('status', ['Active', 'In-Contract']),
    supabase
      .from('interactions')
      .select('company_id, occurred_at')
      .order('occurred_at', { ascending: false }),
    supabase
      .from('contracts')
      .select('company_id')
      .eq('status', 'Active'),
  ]);

  if (companiesRes.error) console.error('[db/clientHealth] companies error:', companiesRes.error.message);
  if (interactionsRes.error) console.error('[db/clientHealth] interactions error:', interactionsRes.error.message);
  if (contractsRes.error) console.error('[db/clientHealth] contracts error:', contractsRes.error.message);

  const lastInteractionByCompany = new Map<string, string>();
  for (const row of interactionsRes.data ?? []) {
    const companyId = row.company_id as string;
    if (!lastInteractionByCompany.has(companyId)) {
      lastInteractionByCompany.set(companyId, row.occurred_at as string);
    }
  }

  const companiesWithActiveContract = new Set(
    (contractsRes.data ?? []).map((c) => c.company_id as string),
  );

  const counts: Record<HealthBand, number> = { green: 0, yellow: 0, red: 0 };
  const accounts: ClientHealthSummary['accounts'] = [];

  for (const row of companiesRes.data ?? []) {
    const companyId = row.id as string;
    const status = row.status as CompanyStatus;
    const lastContactedAt = lastInteractionByCompany.get(companyId) ?? (row.last_contacted as string | null);
    const band = computeHealthBand({
      status,
      lastContactedAt,
      hasActiveContract: companiesWithActiveContract.has(companyId),
    });
    if (!band) continue;

    counts[band] += 1;
    accounts.push({
      companyId,
      companyName: row.name as string,
      band,
      daysSinceLastContact: lastContactedAt
        ? Math.floor((Date.now() - new Date(lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    });
  }

  return { accounts, counts };
}

// Same 30s revalidate window as getEnterpriseStats; invalidated via the
// 'client-health' tag from the companies/contracts/interactions mutation
// routes alongside their existing 'enterprise-stats' invalidation.
export const getClientHealthSummary = unstable_cache(
  computeClientHealthSummary,
  ['client-health'],
  { revalidate: 30, tags: ['client-health'] },
);
