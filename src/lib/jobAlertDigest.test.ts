import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const {
  mockListActiveJobAlertSubscriptions,
  mockGetJobsPaginated,
  mockTouchJobAlertSubscriptionSent,
  mockSendJobAlertDigestEmail,
  mockLogFailure,
} = vi.hoisted(() => ({
  mockListActiveJobAlertSubscriptions: vi.fn(),
  mockGetJobsPaginated:                vi.fn(),
  mockTouchJobAlertSubscriptionSent:   vi.fn(),
  mockSendJobAlertDigestEmail:         vi.fn(),
  mockLogFailure:                      vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  listActiveJobAlertSubscriptions: mockListActiveJobAlertSubscriptions,
  getJobsPaginated:                mockGetJobsPaginated,
  touchJobAlertSubscriptionSent:   mockTouchJobAlertSubscriptionSent,
}));
vi.mock('@/lib/portalEmail', () => ({ sendJobAlertDigestEmail: mockSendJobAlertDigestEmail }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));

import { runJobAlertDigest } from './jobAlertDigest';

const NOW = new Date('2026-07-07T09:00:00.000Z');
const RECENT = new Date('2026-07-07T01:00:00.000Z').toISOString();  // 8h ago -- within 24h window
const STALE  = new Date('2026-07-04T01:00:00.000Z').toISOString();  // 3 days ago -- outside window

const SUBSCRIPTION = {
  id: 'jas-1',
  email: 'candidate@example.com',
  keyword: 'engineer',
  category: null,
  type: null,
  location: null,
  salaryMin: null,
  unsubscribeToken: 'tok-1',
  active: true,
  lastSentAt: null,
  createdAt: '2026-07-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  process.env.RESEND_API_KEY = 're_test_key';
  mockListActiveJobAlertSubscriptions.mockResolvedValue([SUBSCRIPTION]);
  mockSendJobAlertDigestEmail.mockResolvedValue(undefined);
  mockTouchJobAlertSubscriptionSent.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.RESEND_API_KEY;
});

describe('runJobAlertDigest', () => {
  it('is a no-op when RESEND_API_KEY is not set', async () => {
    delete process.env.RESEND_API_KEY;
    await runJobAlertDigest();
    expect(mockListActiveJobAlertSubscriptions).not.toHaveBeenCalled();
  });

  it('is a no-op when there are no active subscriptions', async () => {
    mockListActiveJobAlertSubscriptions.mockResolvedValue([]);
    await runJobAlertDigest();
    expect(mockGetJobsPaginated).not.toHaveBeenCalled();
    expect(mockSendJobAlertDigestEmail).not.toHaveBeenCalled();
  });

  it('reuses getJobsPaginated with the subscription\'s saved criteria', async () => {
    mockGetJobsPaginated.mockResolvedValue({ jobs: [], total: 0 });
    await runJobAlertDigest();

    expect(mockGetJobsPaginated).toHaveBeenCalledWith({
      keyword:   'engineer',
      category:  undefined,
      type:      undefined,
      location:  undefined,
      salaryMin: undefined,
      limit:     1000,
    });
  });

  it('sends a digest only for jobs posted in the last 24h, and marks the subscription sent', async () => {
    mockGetJobsPaginated.mockResolvedValue({
      jobs: [
        { id: 'jb-1', title: 'Recent Role', company: 'Acme', location: 'Yangon', salaryMin: 500, salaryMax: 800, currency: 'MMK', postedAt: RECENT },
        { id: 'jb-2', title: 'Old Role',    company: 'Acme', location: 'Yangon', salaryMin: 500, salaryMax: 800, currency: 'MMK', postedAt: STALE },
      ],
      total: 2,
    });

    await runJobAlertDigest();

    expect(mockSendJobAlertDigestEmail).toHaveBeenCalledTimes(1);
    const call = mockSendJobAlertDigestEmail.mock.calls[0][0];
    expect(call.to).toBe('candidate@example.com');
    expect(call.jobs).toHaveLength(1);
    expect(call.jobs[0].id).toBe('jb-1');
    expect(call.unsubscribeUrl).toContain('tok-1');
    expect(mockTouchJobAlertSubscriptionSent).toHaveBeenCalledWith('jas-1');
  });

  it('skips sending (and does not touch last_sent_at) when nothing new matches', async () => {
    mockGetJobsPaginated.mockResolvedValue({
      jobs: [{ id: 'jb-2', title: 'Old Role', company: 'Acme', location: 'Yangon', salaryMin: 0, salaryMax: 0, currency: 'MMK', postedAt: STALE }],
      total: 1,
    });

    await runJobAlertDigest();

    expect(mockSendJobAlertDigestEmail).not.toHaveBeenCalled();
    expect(mockTouchJobAlertSubscriptionSent).not.toHaveBeenCalled();
  });

  it('logs a failure and continues past one subscription whose send fails', async () => {
    const secondSub = { ...SUBSCRIPTION, id: 'jas-2', email: 'other@example.com' };
    mockListActiveJobAlertSubscriptions.mockResolvedValue([SUBSCRIPTION, secondSub]);
    mockGetJobsPaginated.mockResolvedValue({
      jobs: [{ id: 'jb-1', title: 'Recent Role', company: 'Acme', location: 'Yangon', salaryMin: 500, salaryMax: 800, currency: 'MMK', postedAt: RECENT }],
      total: 1,
    });
    mockSendJobAlertDigestEmail
      .mockRejectedValueOnce(new Error('Resend down'))
      .mockResolvedValueOnce(undefined);

    await runJobAlertDigest();

    expect(mockSendJobAlertDigestEmail).toHaveBeenCalledTimes(2);
    expect(mockTouchJobAlertSubscriptionSent).toHaveBeenCalledTimes(1);
    expect(mockTouchJobAlertSubscriptionSent).toHaveBeenCalledWith('jas-2');
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ context: { subscriptionId: 'jas-1' } }),
    );
  });
});
