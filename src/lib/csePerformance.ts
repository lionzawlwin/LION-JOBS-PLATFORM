import type { CseRep, Contract, B2bLead, CsePerformanceRow } from '@/types';
import { deriveActiveCseByCompany } from '@/lib/cseScope';

export function computeCsePerformance(input: {
  cseReps: CseRep[];
  contracts: Contract[];
  leads: B2bLead[];
}): CsePerformanceRow[] {
  const assignedByCompany = deriveActiveCseByCompany(input.contracts);
  const companiesByCse = new Map<string, Set<string>>();
  for (const [companyId, cseId] of assignedByCompany) {
    if (!companiesByCse.has(cseId)) companiesByCse.set(cseId, new Set());
    companiesByCse.get(cseId)!.add(companyId);
  }

  const activeContracts = input.contracts.filter((c) => c.status === 'Active');

  const rows = input.cseReps.map((rep) => {
    const repActiveContracts = activeContracts.filter((c) => c.cseId === rep.id);
    return {
      cseRepId: rep.id,
      name: rep.name,
      activeContractsCount: repActiveContracts.length,
      activeContractValue: repActiveContracts.reduce((sum, c) => sum + c.value, 0),
      assignedCompaniesCount: companiesByCse.get(rep.id)?.size ?? 0,
      claimedLeadsCount: input.leads.filter((l) => l.claimedByCseRepId === rep.id).length,
    };
  });

  return rows.sort((a, b) => b.activeContractValue - a.activeContractValue);
}
