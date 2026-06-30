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

// ── In-memory rate limiter ────────────────────────────────────────────
// Reliable on single-instance Vercel deployments (free tier).
// For multi-instance scale-out, replace the Map with a Redis/KV store.

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

/**
 * Check and increment a rate-limit bucket.
 * @param key     Unique bucket key, e.g. `"apply:203.0.113.1"`
 * @param limit   Maximum requests allowed per window
 * @param windowS Window duration in seconds
 */
export function checkRateLimit(
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
