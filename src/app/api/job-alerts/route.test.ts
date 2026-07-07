import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockCheckRateLimit,
  mockGetClientIp,
  mockCreateJobAlertSubscription,
  mockLogFailure,
  mockLogRateLimitHit,
} = vi.hoisted(() => ({
  mockCheckRateLimit:             vi.fn(),
  mockGetClientIp:                vi.fn(),
  mockCreateJobAlertSubscription: vi.fn(),
  mockLogFailure:                 vi.fn(),
  mockLogRateLimitHit:            vi.fn(),
}));

vi.mock('@/lib/apiSecurity', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp:    mockGetClientIp,
}));
vi.mock('@/lib/db', () => ({ createJobAlertSubscription: mockCreateJobAlertSubscription }));
vi.mock('@/lib/observability', () => ({
  logFailure:       mockLogFailure,
  logRateLimitHit:  mockLogRateLimitHit,
}));

import { POST } from './route';

function makeRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetClientIp.mockReturnValue('1.2.3.4');
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 2, resetIn: 60 });
  mockCreateJobAlertSubscription.mockResolvedValue({ id: 'jas-1' });
});

describe('POST /api/job-alerts', () => {
  it('creates a subscription for a valid email and search criteria', async () => {
    const res = await POST(
      makeRequest({ email: 'Candidate@Example.com ', keyword: 'engineer', category: 'Engineering', salaryMin: 500 }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, id: 'jas-1' });
    expect(mockCreateJobAlertSubscription).toHaveBeenCalledWith({
      email:     'candidate@example.com',
      keyword:   'engineer',
      category:  'Engineering',
      type:      undefined,
      location:  undefined,
      salaryMin: 500,
    });
  });

  it('rejects an invalid email', async () => {
    const res = await POST(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
    expect(mockCreateJobAlertSubscription).not.toHaveBeenCalled();
  });

  it('rejects a request with no email at all', async () => {
    const res = await POST(makeRequest({ keyword: 'engineer' }));
    expect(res.status).toBe(400);
    expect(mockCreateJobAlertSubscription).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON bodies', async () => {
    const req = { json: async () => { throw new Error('bad json'); } } as unknown as Parameters<typeof POST>[0];
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('rate-limits repeated requests from the same IP', async () => {
    mockCheckRateLimit.mockResolvedValue({ allowed: false, remaining: 0, resetIn: 30 });
    const res = await POST(makeRequest({ email: 'candidate@example.com' }));

    expect(res.status).toBe(429);
    expect(mockLogRateLimitHit).toHaveBeenCalledWith('/api/job-alerts');
    expect(mockCreateJobAlertSubscription).not.toHaveBeenCalled();
  });

  it('returns 500 and logs a failure when the db write throws', async () => {
    mockCreateJobAlertSubscription.mockRejectedValue(new Error('db unreachable'));
    const res = await POST(makeRequest({ email: 'candidate@example.com' }));

    expect(res.status).toBe(500);
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/api/job-alerts' }),
    );
  });
});
