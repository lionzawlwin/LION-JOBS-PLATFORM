import { describe, it, expect } from 'vitest';
import { isInvoiceableCompany } from './companyRules';
import type { Company } from '@/types';

function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: 'co1', name: 'Acme', contactPerson: '', email: '', phone: '',
    industry: '', city: '', status: 'Active', tier: 'smb', notes: '',
    lastContacted: '', createdAt: '2026-01-01T00:00:00Z', isInternal: false,
    parentAccountId: null,
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
