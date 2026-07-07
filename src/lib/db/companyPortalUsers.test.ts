import { describe, it, expect, vi, beforeEach } from 'vitest';

// Same thenable-chain mocking approach jobAlerts.test.ts uses -- one chain
// object where every method returns itself and the object resolves via
// `.then`, covering every call shape this file uses.
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'ilike', 'eq', 'order', 'limit', 'maybeSingle']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

const mockFrom = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import { getActiveCompanyPortalUserByEmail, getSeatRoleForCompanyEmail } from './companyPortalUsers';

beforeEach(() => {
  mockFrom.mockReset();
});

describe('getActiveCompanyPortalUserByEmail', () => {
  it('returns the mapped seat when an active row matches', async () => {
    mockFrom.mockReturnValue(
      makeChain({
        data: [
          {
            id: 'cpu-1',
            company_id: 'comp-1',
            email: 'hr@acme.com',
            name: 'Jane HR',
            seat_role: 'hiring_manager',
            status: 'active',
          },
        ],
        error: null,
      }),
    );

    const result = await getActiveCompanyPortalUserByEmail('hr@acme.com');
    expect(mockFrom).toHaveBeenCalledWith('company_portal_users');
    expect(result).toEqual({
      id: 'cpu-1',
      companyId: 'comp-1',
      email: 'hr@acme.com',
      name: 'Jane HR',
      seatRole: 'hiring_manager',
      status: 'active',
    });
  });

  it('returns null when no active seat matches', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await getActiveCompanyPortalUserByEmail('nobody@example.com');
    expect(result).toBeNull();
  });

  it('returns null on a query error rather than throwing', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection reset' } }));
    const result = await getActiveCompanyPortalUserByEmail('hr@acme.com');
    expect(result).toBeNull();
  });
});

describe('getSeatRoleForCompanyEmail', () => {
  it('returns the matched seat role', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { seat_role: 'viewer' }, error: null }));
    const result = await getSeatRoleForCompanyEmail('comp-1', 'viewer@acme.com');
    expect(result).toBe('viewer');
  });

  it('defaults to owner when no active seat row exists -- pre-Layer-3 companies', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const result = await getSeatRoleForCompanyEmail('comp-1', 'legacy@acme.com');
    expect(result).toBe('owner');
  });

  it('defaults to owner on a query error rather than throwing', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection reset' } }));
    const result = await getSeatRoleForCompanyEmail('comp-1', 'legacy@acme.com');
    expect(result).toBe('owner');
  });
});
