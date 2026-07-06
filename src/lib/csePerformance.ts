import type { CseRep, Contract, B2bLead, CsePerformanceRow, ClientHealthAccount } from '@/types';
import { deriveActiveCseByCompany } from '@/lib/cseScope';

export function computeCsePerformance(input: {
  cseReps: CseRep[];
  contracts: Contract[];
  leads: B2bLead[];
  // Layer 16: optional so existing callers/tests that don't care about
  // health rollups don't need updating -- defaults to no accounts, which
  // makes atRiskAccountsCount 0 for everyone (matches pre-Layer-16 behavior).
  healthAccounts?: ClientHealthAccount[];
}): CsePerformanceRow[] {
  const assignedByCompany = deriveActiveCseByCompany(input.contracts);
  const companiesByCse = new Map<string, Set<string>>();
  for (const [companyId, cseId] of assignedByCompany) {
    if (!companiesByCse.has(cseId)) companiesByCse.set(cseId, new Set());
    companiesByCse.get(cseId)!.add(companyId);
  }

  const redBandByCompany = new Set(
    (input.healthAccounts ?? []).filter((a) => a.band === 'red').map((a) => a.companyId),
  );

  const activeContracts = input.contracts.filter((c) => c.status === 'Active');

  const rows = input.cseReps.map((rep) => {
    const repActiveContracts = activeContracts.filter((c) => c.cseId === rep.id);
    const repCompanies = companiesByCse.get(rep.id) ?? new Set<string>();
    let atRiskAccountsCount = 0;
    for (const companyId of repCompanies) {
      if (redBandByCompany.has(companyId)) atRiskAccountsCount++;
    }
    return {
      cseRepId: rep.id,
      name: rep.name,
      activeContractsCount: repActiveContracts.length,
      activeContractValue: repActiveContracts.reduce((sum, c) => sum + c.value, 0),
      assignedCompaniesCount: repCompanies.size,
      claimedLeadsCount: input.leads.filter((l) => l.claimedByCseRepId === rep.id).length,
      atRiskAccountsCount,
    };
  });

  return rows.sort((a, b) => b.activeContractValue - a.activeContractValue);
}
