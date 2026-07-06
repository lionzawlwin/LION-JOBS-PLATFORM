import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

// ── Timing-safe string comparison ────────────────────────────────────
// Prevents timing attacks where an attacker could measure response latency
// character by character to deduce a shared secret.
// HMAC normalises both inputs to a fixed-length digest before comparing,
// so even different-length strings take the same time to compare.
export function secureCompare(a: string, b: string): boolean {
  const dummyKey = Buffer.alloc(32);
  const aDigest  = createHmac('sha256', dummyKey).update(Buffer.from(a, 'utf8')).digest();
  const bDigest  = createHmac('sha256', dummyKey).update(Buffer.from(b, 'utf8')).digest();
  return timingSafeEqual(aDigest, bDigest);
}

// ── IP extraction ─────────────────────────────────────────────────────
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// ── In-memory rate limiter (fallback) ─────────────────────────────────
// Reliable on single-instance Vercel deployments only -- each serverless
// instance has its own Map, so limits are enforced per-instance, not
// globally, the moment Vercel scales out to more than one. Used whenever
// no KV store is configured (see checkRateLimit() below).

interface Bucket {
  count:   number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Prune expired buckets every 5 minutes to prevent unbounded memory growth.
const pruneTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now >= bucket.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
pruneTimer.unref();

export interface RateLimitResult {
  allowed:   boolean;
  remaining: number;
  resetIn:   number; // seconds until window resets
}

function checkRateLimitInMemory(
  key:     string,
  limit:   number,
  windowS: number,
): RateLimitResult {
  const now    = Date.now();
  const bucket = store.get(key);

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowS * 1000 });
    return { allowed: true, remaining: limit - 1, resetIn: windowS };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { allowed: true, remaining: limit - bucket.count, resetIn: Math.ceil((bucket.resetAt - now) / 1000) };
}

// ── KV-backed rate limiter (CTO Technical Audit Phase 2) ──────────────
// Activates automatically the moment a Vercel KV / Upstash Redis store is
// attached to this project -- Vercel injects KV_REST_API_URL/
// KV_REST_API_TOKEN into the environment for you, no code change needed.
// Deliberately calls the REST API directly with fetch rather than adding
// the @vercel/kv or @upstash/redis SDK as a dependency: this is one
// pipelined HTTP call, and it can't be tested against a real store in
// this environment (no KV instance provisioned), so it's written to the
// documented wire protocol instead of an SDK this session can't verify
// actually installs/builds cleanly.
//
// Fixed-window counter: INCR the key, set its TTL only if it doesn't
// already have one (NX) so an in-progress window's expiry is never
// pushed back by a later request, then read the TTL back for resetIn.
async function checkRateLimitKv(
  key:     string,
  limit:   number,
  windowS: number,
  kvUrl:   string,
  kvToken: string,
): Promise<RateLimitResult> {
  const res = await fetch(`${kvUrl}/pipeline`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${kvToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowS, 'NX'],
      ['TTL', key],
    ]),
  });
  if (!res.ok) throw new Error(`KV rate-limit request failed: ${res.status}`);

  const [incrResult, , ttlResult] = (await res.json()) as { result: number }[];
  const count    = incrResult.result;
  const ttl      = ttlResult.result;
  const resetIn  = ttl > 0 ? ttl : windowS;

  if (count > limit) return { allowed: false, remaining: 0, resetIn };
  return { allowed: true, remaining: limit - count, resetIn };
}

/**
 * Check and increment a rate-limit bucket. Uses Vercel KV / Upstash Redis
 * (shared across every serverless instance) when KV_REST_API_URL/
 * KV_REST_API_TOKEN are set; otherwise falls back to the in-memory Map,
 * which only enforces limits correctly on a single instance.
 * @param key     Unique bucket key, e.g. `"apply:203.0.113.1"`
 * @param limit   Maximum requests allowed per window
 * @param windowS Window duration in seconds
 */
export async function checkRateLimit(
  key:     string,
  limit:   number,
  windowS: number,
): Promise<RateLimitResult> {
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (kvUrl && kvToken) {
    try {
      return await checkRateLimitKv(key, limit, windowS, kvUrl, kvToken);
    } catch {
      // KV unreachable -- fail open to the in-memory limiter rather than
      // letting a KV outage take down every rate-limited route.
      return checkRateLimitInMemory(key, limit, windowS);
    }
  }

  return checkRateLimitInMemory(key, limit, windowS);
}
