import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDeactivateJobAlertSubscriptionByToken, mockLogFailure } = vi.hoisted(() => ({
  mockDeactivateJobAlertSubscriptionByToken: vi.fn(),
  mockLogFailure:                            vi.fn(),
}));

vi.mock('@/lib/db', () => ({ deactivateJobAlertSubscriptionByToken: mockDeactivateJobAlertSubscriptionByToken }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));

import { GET } from './route';

function makeRequest(token: string | null) {
  const url = new URL('https://lion-jobs-platform.vercel.app/api/job-alerts/unsubscribe');
  if (token !== null) url.searchParams.set('token', token);
  return { nextUrl: url, url: url.toString() } as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/job-alerts/unsubscribe', () => {
  it('redirects with jobAlert=missing_token when no token is provided', async () => {
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('jobAlert=missing_token');
    expect(mockDeactivateJobAlertSubscriptionByToken).not.toHaveBeenCalled();
  });

  it('deactivates the subscription and redirects with jobAlert=unsubscribed for a valid token', async () => {
    mockDeactivateJobAlertSubscriptionByToken.mockResolvedValue(true);
    const res = await GET(makeRequest('tok-1'));

    expect(mockDeactivateJobAlertSubscriptionByToken).toHaveBeenCalledWith('tok-1');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('jobAlert=unsubscribed');
  });

  it('still redirects to jobAlert=unsubscribed for an unknown/already-inactive token (not an error)', async () => {
    mockDeactivateJobAlertSubscriptionByToken.mockResolvedValue(false);
    const res = await GET(makeRequest('bad-token'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('jobAlert=unsubscribed');
  });

  it('redirects to jobAlert=error and logs the failure when the db call throws', async () => {
    mockDeactivateJobAlertSubscriptionByToken.mockRejectedValue(new Error('db unreachable'));
    const res = await GET(makeRequest('tok-1'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('jobAlert=error');
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/api/job-alerts/unsubscribe' }),
    );
  });
});
