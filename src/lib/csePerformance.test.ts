import { describe, it, expect } from 'vitest';
import { computeCsePerformance } from './csePerformance';
import type { CseRep, Contract, B2bLead } from '@/types';

function cseRep(overrides: Partial<CseRep> = {}): CseRep {
  return { id: 'cse-1', name: 'Alice', phone: '', email: '', active: true, createdAt: '', ...overrides };
}

function contract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'ct-1', companyId: 'co-1', value: 1000, currency: 'USD',
    contractType: 'Retainer', status: 'Active', startDate: null, endDate: null,
    cseId: 'cse-1', notes: '', createdAt: '', ...overrides,
  };
}

function lead(overrides: Partial<B2bLead> = {}): B2bLead {
  return {
    id: 'lead-1', companyName: 'Acme', industry: '', location: '', website: '',
    contactName: '', contactTitle: '', workEmail: '', phone: '', jobTitle: '',
    headcount: '', workSetup: '', salaryBudget: '', urgency: '', requirements: '',
    agencyMessage: '', jobDescription: '', benefits: '', submittedAt: '',
    statusUpdatedAt: '', status: 'New', claimedByCseRepId: 'cse-1', claimedAt: null,
    ...overrides,
  };
}

describe('computeCsePerformance', () => {
  it('computes active contract count and value for a rep', () => {
    const rows = computeCsePerformance({
      cseReps: [cseRep()], contracts: [contract({ value: 500 }), contract({ id: 'ct-2', value: 700 })], leads: [],
    });
    expect(rows).toEqual([{
      cseRepId: 'cse-1', name: 'Alice', activeContractsCount: 2, activeContractValue: 1200,
      assignedCompaniesCount: 1, claimedLeadsCount: 0, atRiskAccountsCount: 0,
    }]);
  });

  it('excludes non-active contracts from count and value', () => {
    const rows = computeCsePerformance({
      cseReps: [cseRep()], contracts: [contract({ status: 'Draft', value: 999 })], leads: [],
    });
    expect(rows[0]).toMatchObject({ activeContractsCount: 0, activeContractValue: 0 });
  });

  it('counts distinct assigned companies via active contracts', () => {
    const rows = computeCsePerformance({
      cseReps: [cseRep()],
      contracts: [contract({ companyId: 'co-1' }), contract({ id: 'ct-2', companyId: 'co-1' }), contract({ id: 'ct-3', companyId: 'co-2' })],
      leads: [],
    });
    expect(rows[0].assignedCompaniesCount).toBe(2);
  });

  it('counts claimed leads for a rep', () => {
    const rows = computeCsePerformance({
      cseReps: [cseRep()], contracts: [],
      leads: [lead(), lead({ id: 'lead-2' }), lead({ id: 'lead-3', claimedByCseRepId: 'cse-2' })],
    });
    expect(rows[0].claimedLeadsCount).toBe(2);
  });

  it('does not attribute another reps contracts or leads', () => {
    const rows = computeCsePerformance({
      cseReps: [cseRep({ id: 'cse-1' }), cseRep({ id: 'cse-2', name: 'Bob' })],
      contracts: [contract({ cseId: 'cse-1', value: 100 }), contract({ id: 'ct-2', cseId: 'cse-2', value: 200 })],
      leads: [lead({ claimedByCseRepId: 'cse-2' })],
    });
    const alice = rows.find((r) => r.cseRepId === 'cse-1')!;
    const bob = rows.find((r) => r.cseRepId === 'cse-2')!;
    expect(alice).toMatchObject({ activeContractValue: 100, claimedLeadsCount: 0 });
    expect(bob).toMatchObject({ activeContractValue: 200, claimedLeadsCount: 1 });
  });

  it('sorts by active contract value descending', () => {
    const rows = computeCsePerformance({
      cseReps: [cseRep({ id: 'cse-1', name: 'Low' }), cseRep({ id: 'cse-2', name: 'High' })],
      contracts: [contract({ cseId: 'cse-1', value: 100 }), contract({ id: 'ct-2', cseId: 'cse-2', value: 900 })],
      leads: [],
    });
    expect(rows.map((r) => r.name)).toEqual(['High', 'Low']);
  });

  it('returns an empty array for no reps', () => {
    expect(computeCsePerformance({ cseReps: [], contracts: [], leads: [] })).toEqual([]);
  });

  it('counts only red-band assigned companies as at-risk', () => {
    const rows = computeCsePerformance({
      cseReps: [cseRep()],
      contracts: [contract({ companyId: 'co-1' }), contract({ id: 'ct-2', companyId: 'co-2' })],
      leads: [],
      healthAccounts: [
        { companyId: 'co-1', companyName: 'Red Co', band: 'red', daysSinceLastContact: 40 },
        { companyId: 'co-2', companyName: 'Green Co', band: 'green', daysSinceLastContact: 2 },
      ],
    });
    expect(rows[0].atRiskAccountsCount).toBe(1);
  });
});
