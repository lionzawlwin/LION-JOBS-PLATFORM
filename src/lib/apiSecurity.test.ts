import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit, getClientIp, secureCompare } from './apiSecurity';

// No KV_REST_API_URL/TOKEN is set in the test environment, so every call
// here exercises the in-memory fallback path -- checkRateLimit() is async
// regardless of which backend serves it.
describe('checkRateLimit', () => {
  it('allows requests up to the limit, then blocks', async () => {
    const key = `test-basic-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(key, 3, 60);
      expect(result.allowed).toBe(true);
    }
    const blocked = await checkRateLimit(key, 3, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('tracks remaining count correctly within the window', async () => {
    const key = `test-remaining-${Math.random()}`;
    expect((await checkRateLimit(key, 5, 60)).remaining).toBe(4);
    expect((await checkRateLimit(key, 5, 60)).remaining).toBe(3);
    expect((await checkRateLimit(key, 5, 60)).remaining).toBe(2);
  });

  it('resets the window after it expires', async () => {
    vi.useFakeTimers();
    try {
      const key = `test-reset-${Math.random()}`;
      expect((await checkRateLimit(key, 1, 10)).allowed).toBe(true);
      expect((await checkRateLimit(key, 1, 10)).allowed).toBe(false);

      vi.advanceTimersByTime(11_000);

      expect((await checkRateLimit(key, 1, 10)).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps separate buckets for different keys', async () => {
    const keyA = `test-isolation-a-${Math.random()}`;
    const keyB = `test-isolation-b-${Math.random()}`;
    expect((await checkRateLimit(keyA, 1, 60)).allowed).toBe(true);
    expect((await checkRateLimit(keyA, 1, 60)).allowed).toBe(false);
    // keyB's own bucket is unaffected by keyA's usage
    expect((await checkRateLimit(keyB, 1, 60)).allowed).toBe(true);
  });
});

describe('checkRateLimit (KV backend)', () => {
  const originalUrl   = process.env.KV_REST_API_URL;
  const originalToken = process.env.KV_REST_API_TOKEN;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.KV_REST_API_URL; else process.env.KV_REST_API_URL = originalUrl;
    if (originalToken === undefined) delete process.env.KV_REST_API_TOKEN; else process.env.KV_REST_API_TOKEN = originalToken;
    vi.unstubAllGlobals();
  });

  it('uses the KV pipeline response when KV_REST_API_URL/TOKEN are set', async () => {
    process.env.KV_REST_API_URL   = 'https://example-kv.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => [{ result: 2 }, { result: 1 }, { result: 60 }],
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkRateLimit('kv-test-key', 5, 60);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example-kv.upstash.io/pipeline',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toEqual({ allowed: true, remaining: 3, resetIn: 60 });
  });

  it('blocks once the KV-reported count exceeds the limit', async () => {
    process.env.KV_REST_API_URL   = 'https://example-kv.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:   true,
      json: async () => [{ result: 6 }, { result: 0 }, { result: 42 }],
    }));

    const result = await checkRateLimit('kv-test-key-blocked', 5, 60);
    expect(result).toEqual({ allowed: false, remaining: 0, resetIn: 42 });
  });

  it('fails open to the in-memory limiter when KV is unreachable', async () => {
    process.env.KV_REST_API_URL   = 'https://example-kv.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const result = await checkRateLimit(`kv-fallback-${Math.random()}`, 3, 60);
    expect(result.allowed).toBe(true);
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
