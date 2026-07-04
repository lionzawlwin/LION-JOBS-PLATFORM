import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';
import type { EnterpriseStats } from '@/types';

// Uses unstable_cache (not the newer `use cache` directive) deliberately:
// `use cache`'s Cache Components model defaults to a per-instance in-memory
// LRU that Next's own docs say "typically doesn't persist across requests"
// on serverless platforms like Vercel -- reliable cross-request persistence
// there requires `use cache: remote`, a paid external cache handler (Redis/
// KV). `unstable_cache` instead persists via Vercel's built-in Data Cache,
// which works across serverless invocations today with no new
// infrastructure or cost. Revisit if this app ever migrates off
// unstable_cache's eventual removal, but not before `use cache: remote` (or
// self-hosting) is actually in the plan.
async function computeEnterpriseStats(): Promise<EnterpriseStats> {
  // Intentionally bypasses getContracts()/getCompanies()/getCseReps() — this needs
  // narrow column projections and count-only/aggregate queries those functions
  // don't provide. If contracts/companies schema changes, check this file too.
  const [contractsRes, companiesRes, cseRes] = await Promise.all([
    supabase.from('contracts').select('value, cse_id').eq('status', 'Active').order('cse_id'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('tier', 'enterprise'),
    supabase.from('cse_reps').select('id, name'),
  ]);

  if (contractsRes.error) console.error('[db/enterpriseStats] contracts error:', contractsRes.error.message);
  if (companiesRes.error) console.error('[db/enterpriseStats] companies error:', companiesRes.error.message);
  if (cseRes.error) console.error('[db/enterpriseStats] cse error:', cseRes.error.message);

  const activeContracts = contractsRes.data ?? [];
  const cseNameById = new Map(
    (cseRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );

  const totalActiveContractValue = activeContracts.reduce(
    (sum, c) => sum + Number(c.value ?? 0), 0,
  );
  const activeContractsCount = activeContracts.length;
  const enterpriseAccountsCount = companiesRes.count ?? 0;

  const valueByCse = new Map<string, number>();
  for (const c of activeContracts) {
    const cseId = c.cse_id as string | null;
    if (!cseId) continue;
    valueByCse.set(cseId, (valueByCse.get(cseId) ?? 0) + Number(c.value ?? 0));
  }

  let topCse: EnterpriseStats['topCse'] = null;
  for (const [id, value] of valueByCse) {
    if (!topCse || value > topCse.value) {
      topCse = { id, name: cseNameById.get(id) ?? 'Unknown', value };
    }
  }

  return { totalActiveContractValue, activeContractsCount, enterpriseAccountsCount, topCse };
}

// 30s revalidate window covers "several staff viewing Enterprise
// concurrently" without recomputing 3 aggregate queries per request; tag
// invalidation (revalidateTag('enterprise-stats')) in the contracts/
// companies/cse mutation routes keeps it accurate immediately after an edit
// rather than waiting out the window.
export const getEnterpriseStats = unstable_cache(
  computeEnterpriseStats,
  ['enterprise-stats'],
  { revalidate: 30, tags: ['enterprise-stats'] },
);
