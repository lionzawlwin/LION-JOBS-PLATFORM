import type { Company, Contract } from '@/types';

// A company's "owning" CSE is the cseId of its most recent Active
// contract. Mirrors EnterpriseView.tsx's client-side filter-dropdown
// derivation exactly — this just makes it the actual security boundary
// (server-side) instead of a UX convenience (client-side).
export function deriveActiveCseByCompany(contracts: Contract[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of contracts) {
    if (c.status !== 'Active' || !c.cseId) continue;
    if (!map.has(c.companyId)) {
      map.set(c.companyId, c.cseId);
    }
  }
  return map;
}

export function filterCompaniesForCse(
  companies: Company[],
  contracts: Contract[],
  cseRepId: string | null,
): Company[] {
  if (!cseRepId) return [];
  const ownerByCompany = deriveActiveCseByCompany(contracts);
  return companies.filter((company) => ownerByCompany.get(company.id) === cseRepId);
}
