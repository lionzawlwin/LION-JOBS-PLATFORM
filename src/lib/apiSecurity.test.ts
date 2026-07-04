import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit, getClientIp, secureCompare } from './apiSecurity';

describe('checkRateLimit', () => {
  it('allows requests up to the limit, then blocks', () => {
    const key = `test-basic-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = checkRateLimit(key, 3, 60);
      expect(result.allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks remaining count correctly within the window', () => {
    const key = `test-remaining-${Math.random()}`;
    expect(checkRateLimit(key, 5, 60).remaining).toBe(4);
    expect(checkRateLimit(key, 5, 60).remaining).toBe(3);
    expect(checkRateLimit(key, 5, 60).remaining).toBe(2);
  });

  it('resets the window after it expires', () => {
    vi.useFakeTimers();
    try {
      const key = `test-reset-${Math.random()}`;
      expect(checkRateLimit(key, 1, 10).allowed).toBe(true);
      expect(checkRateLimit(key, 1, 10).allowed).toBe(false);

      vi.advanceTimersByTime(11_000);

      expect(checkRateLimit(key, 1, 10).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps separate buckets for different keys', () => {
    const keyA = `test-isolation-a-${Math.random()}`;
    const keyB = `test-isolation-b-${Math.random()}`;
    expect(checkRateLimit(keyA, 1, 60).allowed).toBe(true);
    expect(checkRateLimit(keyA, 1, 60).allowed).toBe(false);
    // keyB's own bucket is unaffected by keyA's usage
    expect(checkRateLimit(keyB, 1, 60).allowed).toBe(true);
  });
});

describe('getClientIp', () => {
  function fakeRequest(headers: Record<string, string>) {
    return {
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  it('reads the first IP from x-forwarded-for', () => {
    expect(getClientIp(fakeRequest({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' }))).toBe('203.0.113.1');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    expect(getClientIp(fakeRequest({ 'x-real-ip': '198.51.100.5' }))).toBe('198.51.100.5');
  });

  it('falls back to "unknown" when neither header is present', () => {
    expect(getClientIp(fakeRequest({}))).toBe('unknown');
  });
});

describe('secureCompare', () => {
  it('returns true for identical strings', () => {
    expect(secureCompare('same-secret', 'same-secret')).toBe(true);
  });

  it('returns false for different strings, including different lengths', () => {
    expect(secureCompare('secret-a', 'secret-b')).toBe(false);
    expect(secureCompare('short', 'a-much-longer-string')).toBe(false);
  });
});
