import type { JobRequest, Company } from '@/types';

export interface JobRequestWithCompany extends JobRequest {
  companyName: string;
}

export function attachCompanyNames(requests: JobRequest[], companies: Company[]): JobRequestWithCompany[] {
  const nameById = new Map(companies.map((c) => [c.id, c.name]));
  return requests.map((r) => ({ ...r, companyName: nameById.get(r.companyId) ?? 'Unknown company' }));
}
