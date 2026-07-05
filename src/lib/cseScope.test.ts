import { describe, it, expect } from 'vitest';
import { deriveActiveCseByCompany, filterCompaniesForCse } from './cseScope';
import type { Company, Contract } from '@/types';

function makeContract(overrides: Partial<Contract>): Contract {
  return {
    id: 'c1', companyId: 'co1', value: 0, currency: 'MMK',
    contractType: 'Retainer', status: 'Active', startDate: null, endDate: null,
    cseId: 'cse1', notes: '', createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: 'co1', name: 'Acme', contactPerson: '', email: '', phone: '',
    industry: '', city: '', status: 'Active', tier: 'smb', notes: '',
    lastContacted: '', createdAt: '2026-01-01T00:00:00Z', isInternal: false,
    ...overrides,
  };
}

describe('deriveActiveCseByCompany', () => {
  it('maps a company to its Active contract\'s cseId', () => {
    const map = deriveActiveCseByCompany([makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Active' })]);
    expect(map.get('co1')).toBe('cse1');
  });

  it('ignores non-Active contracts', () => {
    const map = deriveActiveCseByCompany([makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Draft' })]);
    expect(map.has('co1')).toBe(false);
  });

  it('ignores contracts with no cseId', () => {
    const map = deriveActiveCseByCompany([makeContract({ companyId: 'co1', cseId: null, status: 'Active' })]);
    expect(map.has('co1')).toBe(false);
  });

  it('takes the first-seen Active contract when a company has more than one', () => {
    const map = deriveActiveCseByCompany([
      makeContract({ id: 'c1', companyId: 'co1', cseId: 'cse1', status: 'Active' }),
      makeContract({ id: 'c2', companyId: 'co1', cseId: 'cse2', status: 'Active' }),
    ]);
    expect(map.get('co1')).toBe('cse1');
  });

  it('handles multiple companies independently', () => {
    const map = deriveActiveCseByCompany([
      makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Active' }),
      makeContract({ id: 'c2', companyId: 'co2', cseId: 'cse2', status: 'Active' }),
    ]);
    expect(map.get('co1')).toBe('cse1');
    expect(map.get('co2')).toBe('cse2');
  });
});

describe('filterCompaniesForCse', () => {
  const contracts = [
    makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Active' }),
    makeContract({ id: 'c2', companyId: 'co2', cseId: 'cse2', status: 'Active' }),
  ];
  const companies = [makeCompany({ id: 'co1' }), makeCompany({ id: 'co2', name: 'Other' })];

  it('returns only companies owned by the given cseRepId', () => {
    expect(filterCompaniesForCse(companies, contracts, 'cse1')).toEqual([companies[0]]);
  });

  it('returns an empty array for a cseRepId with no owned companies', () => {
    expect(filterCompaniesForCse(companies, contracts, 'cse-nobody')).toEqual([]);
  });

  it('fails closed — returns an empty array when cseRepId is null', () => {
    expect(filterCompaniesForCse(companies, contracts, null)).toEqual([]);
  });
});
