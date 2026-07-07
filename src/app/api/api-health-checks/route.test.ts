import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireTabAccess,
  mockGetRecentApiHealthChecks,
} = vi.hoisted(() => ({
  mockRequireTabAccess:         vi.fn(),
  mockGetRecentApiHealthChecks: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireTabAccess: mockRequireTabAccess }));
vi.mock('@/lib/db', () => ({ getRecentApiHealthChecks: mockGetRecentApiHealthChecks }));

import { GET } from './route';

function makeRequest(query = '') {
  return { nextUrl: new URL(`https://example.com/api/api-health-checks${query}`) } as unknown as Parameters<typeof GET>[0];
}

const SAMPLE_CHECKS = [
  { id: 'chk-1', route: '/api/jobs', latencyMs: 120, status: 'ok' as const, checkedAt: '2026-07-07T09:00:00.000Z' },
  { id: 'chk-2', route: '/dashboard', latencyMs: 340, status: 'ok' as const, checkedAt: '2026-07-07T09:00:00.000Z' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTabAccess.mockResolvedValue(true);
  mockGetRecentApiHealthChecks.mockResolvedValue(SAMPLE_CHECKS);
});

describe('GET /api/api-health-checks', () => {
  it('rejects a caller without system-health view access', async () => {
    mockRequireTabAccess.mockResolvedValue(false);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockGetRecentApiHealthChecks).not.toHaveBeenCalled();
  });

  it('defaults to a 24 hour window', async () => {
    await GET(makeRequest());
    expect(mockGetRecentApiHealthChecks).toHaveBeenCalledWith(24);
  });

  it('honors an explicit hours param', async () => {
    await GET(makeRequest('?hours=48'));
    expect(mockGetRecentApiHealthChecks).toHaveBeenCalledWith(48);
  });

  it('rejects a non-positive hours param', async () => {
    const res = await GET(makeRequest('?hours=0'));
    expect(res.status).toBe(422);
    expect(mockGetRecentApiHealthChecks).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric hours param', async () => {
    const res = await GET(makeRequest('?hours=abc'));
    expect(res.status).toBe(422);
  });

  it('returns summarized, grouped checks', async () => {
    const res = await GET(makeRequest());
    const json = await res.json();
    expect(json.checks).toEqual([
      expect.objectContaining({ route: '/api/jobs', latestLatencyMs: 120, sampleCount: 1 }),
      expect.objectContaining({ route: '/dashboard', latestLatencyMs: 340, sampleCount: 1 }),
    ]);
  });
});
