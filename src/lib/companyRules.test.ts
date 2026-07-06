import { describe, it, expect } from 'vitest';
import {
  isInvoiceableCompany,
  featuredPlacementInvoicePosition,
  parseFeaturedPlacementDurationDays,
  canViewJobApplicants,
} from './companyRules';
import type { Company } from '@/types';

function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: 'co1', name: 'Acme', contactPerson: '', email: '', phone: '',
    industry: '', city: '', status: 'Active', tier: 'smb', notes: '',
    lastContacted: '', createdAt: '2026-01-01T00:00:00Z', isInternal: false,
    parentAccountId: null, planId: null, isFeatured: false, featuredUntil: null,
    ...overrides,
  };
}

describe('isInvoiceableCompany', () => {
  it('returns true for a normal (non-internal) company', () => {
    expect(isInvoiceableCompany(makeCompany({ isInternal: false }))).toBe(true);
  });

  it('returns false for an internal company', () => {
    expect(isInvoiceableCompany(makeCompany({ isInternal: true }))).toBe(false);
  });
});

describe('featured placement invoice tagging', () => {
  it('round-trips: a generated position yields back the exact duration it was tagged with', () => {
    expect(parseFeaturedPlacementDurationDays(featuredPlacementInvoicePosition(30))).toBe(30);
    expect(parseFeaturedPlacementDurationDays(featuredPlacementInvoicePosition(90))).toBe(90);
  });

  it('does not misclassify a candidate-placement or plan-upgrade invoice position', () => {
    expect(parseFeaturedPlacementDurationDays('Senior Software Engineer')).toBeNull();
    expect(parseFeaturedPlacementDurationDays('Plan Upgrade — Gold')).toBeNull();
  });
});

// Employer Applicant Visibility's real enforcement boundary (see
// GET /api/company-portal/jobs/[jobId]/applicants). This is the one
// automated check standing in for the manual click-through: it proves a
// company can never be handed another company's applicant list, which is
// the actual security property that matters here -- the column whitelist
// enforced separately in candidates.test.ts covers the other half (what
// fields are visible at all).
describe('canViewJobApplicants', () => {
  it('allows a company to view applicants for its own job', () => {
    expect(canViewJobApplicants({ companyId: 'co-1' }, 'co-1')).toBe(true);
  });

  it('rejects a company requesting a job owned by a different company', () => {
    expect(canViewJobApplicants({ companyId: 'co-1' }, 'co-2')).toBe(false);
  });

  it('fails closed for a job with no companyId at all', () => {
    expect(canViewJobApplicants({ companyId: null }, 'co-1')).toBe(false);
  });

  it('fails closed when the job does not exist', () => {
    expect(canViewJobApplicants(null, 'co-1')).toBe(false);
  });
});
