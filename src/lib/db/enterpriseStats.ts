import { supabase } from '@/lib/supabase';
import type { EnterpriseStats } from '@/types';

export async function getEnterpriseStats(): Promise<EnterpriseStats> {
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
