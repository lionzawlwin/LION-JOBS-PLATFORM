import { describe, it, expect } from 'vitest';
import {
  isInvoiceableCompany,
  featuredPlacementInvoicePosition,
  isFeaturedPlacementInvoicePosition,
  FEATURED_PLACEMENT_DURATION_DAYS,
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
  it('round-trips: a generated position is recognized as a featured placement invoice', () => {
    const position = featuredPlacementInvoicePosition();
    expect(position).toContain(String(FEATURED_PLACEMENT_DURATION_DAYS));
    expect(isFeaturedPlacementInvoicePosition(position)).toBe(true);
  });

  it('does not misclassify a candidate-placement or plan-upgrade invoice position', () => {
    expect(isFeaturedPlacementInvoicePosition('Senior Software Engineer')).toBe(false);
    expect(isFeaturedPlacementInvoicePosition('Plan Upgrade — Gold')).toBe(false);
  });
});
