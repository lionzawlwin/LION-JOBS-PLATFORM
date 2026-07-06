import { describe, it, expect } from 'vitest';
import { buildSearchResults } from './search';
import type { Candidate, Company, Job, B2bLead, JobRequest } from '@/types';

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 'app-1', name: 'Jane Doe', email: 'jane@example.com', phone: '09123456',
    position: 'Engineer', matchScore: 0, stage: 'Applied', appliedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: 'co-1', name: 'Acme Ltd', contactPerson: '', email: 'hr@acme.com', phone: '',
    industry: '', city: '', status: 'Active', tier: 'smb', notes: '',
    lastContacted: '', createdAt: '', isInternal: false, parentAccountId: null, planId: null, isFeatured: false, featuredUntil: null, ...overrides,
  };
}

function job(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1', title: 'Backend Engineer', company: 'Acme', location: 'Yangon',
    category: 'Engineering', type: 'Full-time', salaryMin: 100, salaryMax: 200,
    currency: 'USD', description: '', requirements: [], postedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function lead(overrides: Partial<B2bLead> = {}): B2bLead {
  return {
    id: 'lead-1', companyName: 'Widgets Inc', industry: '', location: '', website: '',
    contactName: 'Bob Smith', contactTitle: '', workEmail: 'bob@widgets.com', phone: '',
    jobTitle: '', headcount: '', workSetup: '', salaryBudget: '', urgency: '',
    requirements: '', agencyMessage: '', jobDescription: '', benefits: '',
    submittedAt: '2026-07-01T00:00:00.000Z', statusUpdatedAt: '2026-07-01T00:00:00.000Z',
    status: 'New', claimedByCseRepId: null, claimedAt: null, ...overrides,
  };
}

function jobRequest(overrides: Partial<JobRequest> = {}): JobRequest {
  return {
    id: 'jr-1', companyId: 'co-1', title: 'Frontend Engineer', location: 'Yangon',
    category: 'Engineering', type: 'Full-time', salaryMin: 100, salaryMax: 200,
    currency: 'USD', description: '', requirements: [], status: 'Pending',
    submittedAt: '2026-07-01T00:00:00.000Z', reviewedBy: null, reviewedAt: null,
    rejectionNote: null, ...overrides,
  };
}

const emptyInput = { candidates: [], companies: [], jobs: [], leads: [], jobRequests: [] };

describe('buildSearchResults', () => {
  it('returns empty results for an empty query', () => {
    expect(buildSearchResults('', { ...emptyInput, candidates: [candidate()] })).toEqual([]);
  });

  it('returns empty results for a query under 2 characters', () => {
    expect(buildSearchResults('j', { ...emptyInput, candidates: [candidate()] })).toEqual([]);
  });

  it('matches a candidate by name (case-insensitive)', () => {
    const results = buildSearchResults('jane', { ...emptyInput, candidates: [candidate()] });
    expect(results).toEqual([{ id: 'app-1', type: 'candidate', title: 'Jane Doe', subtitle: 'Engineer', href: 'candidates' }]);
  });

  it('matches a candidate by email', () => {
    const results = buildSearchResults('example.com', { ...emptyInput, candidates: [candidate()] });
    expect(results).toHaveLength(1);
  });

  it('matches a candidate by phone', () => {
    const results = buildSearchResults('09123', { ...emptyInput, candidates: [candidate()] });
    expect(results).toHaveLength(1);
  });

  it('matches a company by name', () => {
    const results = buildSearchResults('acme', { ...emptyInput, companies: [company()] });
    expect(results).toEqual([{ id: 'co-1', type: 'company', title: 'Acme Ltd', subtitle: 'hr@acme.com', href: 'companies' }]);
  });

  it('matches a job by title', () => {
    const results = buildSearchResults('backend', { ...emptyInput, jobs: [job()] });
    expect(results).toEqual([{ id: 'job-1', type: 'job', title: 'Backend Engineer', subtitle: 'Yangon', href: 'manage-jobs' }]);
  });

  it('matches a lead by company or contact name', () => {
    const results = buildSearchResults('widgets', { ...emptyInput, leads: [lead()] });
    expect(results).toEqual([{ id: 'lead-1', type: 'lead', title: 'Widgets Inc', subtitle: 'Bob Smith', href: 'b2b-leads' }]);
  });

  it('matches a job request by title', () => {
    const results = buildSearchResults('frontend', { ...emptyInput, jobRequests: [jobRequest()] });
    expect(results).toEqual([{ id: 'jr-1', type: 'job_request', title: 'Frontend Engineer', subtitle: 'Yangon', href: 'manage-jobs' }]);
  });

  it('excludes non-matching entities', () => {
    const results = buildSearchResults('zzz', { ...emptyInput, candidates: [candidate()], companies: [company()] });
    expect(results).toEqual([]);
  });

  it('caps results at 5 per entity type', () => {
    const candidates = Array.from({ length: 8 }, (_, i) => candidate({ id: `app-${i}`, name: `Match ${i}` }));
    const results = buildSearchResults('match', { ...emptyInput, candidates });
    expect(results.filter((r) => r.type === 'candidate')).toHaveLength(5);
  });

  it('caps total results at 25 across all types', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => candidate({ id: `c${i}`, name: `Match ${i}` }));
    const companies = Array.from({ length: 10 }, (_, i) => company({ id: `co${i}`, name: `Match ${i}` }));
    const jobs = Array.from({ length: 10 }, (_, i) => job({ id: `j${i}`, title: `Match ${i}` }));
    const results = buildSearchResults('match', { candidates, companies, jobs, leads: [], jobRequests: [] });
    expect(results.length).toBeLessThanOrEqual(25);
  });
});
