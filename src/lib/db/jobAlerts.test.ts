import { describe, it, expect, vi, beforeEach } from 'vitest';

// Job Alert Subscriptions accessor tests. Same Supabase-mocking approach
// candidates.applicantVisibility.test.ts pioneered, generalized into a
// single thenable chain builder: the real supabase-js query builder is
// thenable at every stage (awaiting it at any point resolves), so rather
// than mocking one exact method-call sequence per function, one chain
// object -- where every method returns itself and the object itself
// resolves via `.then` -- covers all four call shapes this file uses
// (insert->select->single, select->eq->order, update->eq->eq->select,
// update->eq).
function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const method of ['insert', 'select', 'eq', 'order', 'update', 'single']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

const mockFrom = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

import {
  createJobAlertSubscription,
  listActiveJobAlertSubscriptions,
  deactivateJobAlertSubscriptionByToken,
  touchJobAlertSubscriptionSent,
} from './jobAlerts';

beforeEach(() => {
  mockFrom.mockReset();
});

describe('createJobAlertSubscription', () => {
  it('inserts the search criteria and returns the mapped subscription', async () => {
    const row = {
      id: 'jas-1',
      email: 'candidate@example.com',
      keyword: 'engineer',
      category: 'Engineering',
      type: null,
      location: 'Yangon, Myanmar',
      salary_min: 500,
      unsubscribe_token: 'tok-abc123',
      active: true,
      last_sent_at: null,
      created_at: '2026-07-07T00:00:00.000Z',
    };
    mockFrom.mockReturnValue(makeChain({ data: row, error: null }));

    const result = await createJobAlertSubscription({
      email: 'candidate@example.com',
      keyword: 'engineer',
      category: 'Engineering',
      location: 'Yangon, Myanmar',
      salaryMin: 500,
    });

    expect(mockFrom).toHaveBeenCalledWith('job_alert_subscriptions');
    expect(result).toEqual({
      id: 'jas-1',
      email: 'candidate@example.com',
      keyword: 'engineer',
      category: 'Engineering',
      type: null,
      location: 'Yangon, Myanmar',
      salaryMin: 500,
      unsubscribeToken: 'tok-abc123',
      active: true,
      lastSentAt: null,
      createdAt: '2026-07-07T00:00:00.000Z',
    });
  });

  it('throws when the insert fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection reset' } }));
    await expect(createJobAlertSubscription({ email: 'candidate@example.com' })).rejects.toThrow(
      'connection reset',
    );
  });
});

describe('listActiveJobAlertSubscriptions', () => {
  it('returns mapped active subscriptions', async () => {
    mockFrom.mockReturnValue(
      makeChain({
        data: [
          {
            id: 'jas-1',
            email: 'a@example.com',
            keyword: null,
            category: null,
            type: null,
            location: null,
            salary_min: null,
            unsubscribe_token: 'tok-1',
            active: true,
            last_sent_at: null,
            created_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    );

    const result = await listActiveJobAlertSubscriptions();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('jas-1');
    expect(result[0].unsubscribeToken).toBe('tok-1');
  });

  it('returns an empty array on a query error rather than throwing', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection reset' } }));
    const result = await listActiveJobAlertSubscriptions();
    expect(result).toEqual([]);
  });
});

describe('deactivateJobAlertSubscriptionByToken', () => {
  it('returns true when an active row was deactivated', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [{ id: 'jas-1' }], error: null }));
    const result = await deactivateJobAlertSubscriptionByToken('tok-1');
    expect(result).toBe(true);
  });

  it('returns false for an unknown or already-inactive token, not an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await deactivateJobAlertSubscriptionByToken('bad-token');
    expect(result).toBe(false);
  });

  it('throws on a db error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection reset' } }));
    await expect(deactivateJobAlertSubscriptionByToken('tok-1')).rejects.toThrow('connection reset');
  });
});

describe('touchJobAlertSubscriptionSent', () => {
  it('resolves without throwing on success', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    await expect(touchJobAlertSubscriptionSent('jas-1')).resolves.toBeUndefined();
  });

  it('does not throw even when the update fails (best-effort)', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection reset' } }));
    await expect(touchJobAlertSubscriptionSent('jas-1')).resolves.toBeUndefined();
  });
});
