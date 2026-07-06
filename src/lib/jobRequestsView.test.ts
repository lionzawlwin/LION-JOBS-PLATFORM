import { describe, it, expect } from 'vitest';
import { attachCompanyNames } from './jobRequestsView';
import type { JobRequest, Company } from '@/types';

function jobRequest(overrides: Partial<JobRequest> = {}): JobRequest {
  return {
    id: 'jr-1', companyId: 'co-1', title: 'Backend Engineer', location: 'Yangon',
    category: 'Engineering', type: 'Full-time', salaryMin: 100, salaryMax: 200,
    currency: 'USD', description: '', requirements: [], status: 'Pending',
    submittedAt: '2026-07-05T00:00:00.000Z', reviewedBy: null, reviewedAt: null,
    rejectionNote: null, ...overrides,
  };
}

function company(overrides: Partial<Company> = {}): Company {
  return {
    id: 'co-1', name: 'Acme Ltd', contactPerson: '', email: '', phone: '',
    industry: '', city: '', status: 'Active', tier: 'smb', notes: '',
    lastContacted: '', createdAt: '', isInternal: false, parentAccountId: null, ...overrides,
  };
}

describe('attachCompanyNames', () => {
  it('attaches the matching company name to each request', () => {
    const result = attachCompanyNames([jobRequest()], [company()]);
    expect(result).toEqual([{ ...jobRequest(), companyName: 'Acme Ltd' }]);
  });

  it('falls back to a placeholder when the company cannot be found', () => {
    const result = attachCompanyNames([jobRequest({ companyId: 'missing' })], [company()]);
    expect(result[0].companyName).toBe('Unknown company');
  });

  it('handles multiple requests against multiple companies', () => {
    const result = attachCompanyNames(
      [jobRequest({ id: 'jr-1', companyId: 'co-1' }), jobRequest({ id: 'jr-2', companyId: 'co-2' })],
      [company({ id: 'co-1', name: 'Acme' }), company({ id: 'co-2', name: 'Widgets Inc' })],
    );
    expect(result.map((r) => r.companyName)).toEqual(['Acme', 'Widgets Inc']);
  });

  it('returns an empty array for no requests', () => {
    expect(attachCompanyNames([], [company()])).toEqual([]);
  });
});
