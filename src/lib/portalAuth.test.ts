import { describe, it, expect, beforeAll, vi } from 'vitest';
import { createSessionToken, verifySessionToken } from './portalAuth';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

beforeAll(() => {
  process.env.PORTAL_SESSION_SECRET = 'test-secret-do-not-use-in-production';
});

describe('createSessionToken / verifySessionToken', () => {
  it('round-trips a valid token for the matching subject type', () => {
    const token = createSessionToken('company', 'comp-123');
    expect(verifySessionToken(token, 'company')).toBe('comp-123');
  });

  it('rejects a token verified against the wrong subject type', () => {
    const token = createSessionToken('candidate', 'cand-456');
    // A candidate session must never be accepted by a company-portal route.
    expect(verifySessionToken(token, 'company')).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const token = createSessionToken('company', 'comp-123');
    const [payloadB64, signature] = token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ subjectType: 'company', subjectId: 'comp-999', exp: Date.now() + 1_000_000 }),
      'utf8',
    ).toString('base64url');
    expect(verifySessionToken(`${tamperedPayload}.${signature}`, 'company')).toBeNull();
    void payloadB64;
  });

  it('rejects a tampered signature', () => {
    const token = createSessionToken('company', 'comp-123');
    const [payloadB64] = token.split('.');
    expect(verifySessionToken(`${payloadB64}.notarealsignature`, 'company')).toBeNull();
  });

  it('rejects an expired token', () => {
    vi.useFakeTimers();
    try {
      const token = createSessionToken('company', 'comp-123');
      vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days, past the 7-day session TTL
      expect(verifySessionToken(token, 'company')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects malformed tokens', () => {
    expect(verifySessionToken('not-a-real-token', 'company')).toBeNull();
    expect(verifySessionToken('', 'company')).toBeNull();
    expect(verifySessionToken(null, 'company')).toBeNull();
    expect(verifySessionToken(undefined, 'company')).toBeNull();
    expect(verifySessionToken('too.many.parts.here', 'company')).toBeNull();
  });

  it('produces different tokens for different subjects, both independently valid', () => {
    const tokenA = createSessionToken('candidate', 'cand-a');
    const tokenB = createSessionToken('candidate', 'cand-b');
    expect(tokenA).not.toBe(tokenB);
    expect(verifySessionToken(tokenA, 'candidate')).toBe('cand-a');
    expect(verifySessionToken(tokenB, 'candidate')).toBe('cand-b');
  });

  it('still verifies correctly when a seatRole is attached (Layer 3, company-only)', () => {
    const token = createSessionToken('company', 'comp-123', { seatRole: 'hiring_manager' });
    expect(verifySessionToken(token, 'company')).toBe('comp-123');
  });
});

describe('getCompanySeatRole', () => {
  it('reads back the seatRole a session was created with', async () => {
    const { cookies } = await import('next/headers');
    const token = createSessionToken('company', 'comp-123', { seatRole: 'viewer' });
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => (name === 'company_portal_session' ? { value: token } : undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const { getCompanySeatRole } = await import('./portalAuth');
    expect(await getCompanySeatRole()).toBe('viewer');
  });

  it('defaults to owner for a valid session with no seatRole claim (pre-Layer-3 token)', async () => {
    const { cookies } = await import('next/headers');
    const token = createSessionToken('company', 'comp-123');
    vi.mocked(cookies).mockResolvedValue({
      get: (name: string) => (name === 'company_portal_session' ? { value: token } : undefined),
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const { getCompanySeatRole } = await import('./portalAuth');
    expect(await getCompanySeatRole()).toBe('owner');
  });

  it('returns null when there is no valid company session', async () => {
    const { cookies } = await import('next/headers');
    vi.mocked(cookies).mockResolvedValue({
      get: () => undefined,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const { getCompanySeatRole } = await import('./portalAuth');
    expect(await getCompanySeatRole()).toBeNull();
  });
});
