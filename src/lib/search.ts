import type { Candidate, Company, Job, B2bLead, JobRequest, SearchResult } from '@/types';

const PER_TYPE_CAP = 5;
const TOTAL_CAP = 25;
const MIN_QUERY_LENGTH = 2;

export interface SearchInput {
  candidates: Candidate[];
  companies: Company[];
  jobs: Job[];
  leads: B2bLead[];
  jobRequests: JobRequest[];
}

function matches(query: string, ...fields: Array<string | undefined>): boolean {
  return fields.some((f) => f?.toLowerCase().includes(query));
}

export function buildSearchResults(query: string, input: SearchInput): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < MIN_QUERY_LENGTH) return [];

  const candidateResults: SearchResult[] = input.candidates
    .filter((c) => matches(q, c.name, c.email, c.phone))
    .slice(0, PER_TYPE_CAP)
    .map((c) => ({ id: c.id, type: 'candidate', title: c.name, subtitle: c.position, href: 'candidates' }));

  const companyResults: SearchResult[] = input.companies
    .filter((c) => matches(q, c.name, c.email))
    .slice(0, PER_TYPE_CAP)
    .map((c) => ({ id: c.id, type: 'company', title: c.name, subtitle: c.email, href: 'companies' }));

  const jobResults: SearchResult[] = input.jobs
    .filter((j) => matches(q, j.title, j.location))
    .slice(0, PER_TYPE_CAP)
    .map((j) => ({ id: j.id, type: 'job', title: j.title, subtitle: j.location, href: 'manage-jobs' }));

  const leadResults: SearchResult[] = input.leads
    .filter((l) => matches(q, l.companyName, l.contactName, l.workEmail))
    .slice(0, PER_TYPE_CAP)
    .map((l) => ({ id: l.id, type: 'lead', title: l.companyName, subtitle: l.contactName, href: 'b2b-leads' }));

  const jobRequestResults: SearchResult[] = input.jobRequests
    .filter((jr) => matches(q, jr.title))
    .slice(0, PER_TYPE_CAP)
    .map((jr) => ({ id: jr.id, type: 'job_request', title: jr.title, subtitle: jr.location, href: 'manage-jobs' }));

  return [...candidateResults, ...companyResults, ...jobResults, ...leadResults, ...jobRequestResults].slice(0, TOTAL_CAP);
}
