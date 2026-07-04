import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

/**
 * Shared magic-link + session auth for the Company Portal and Candidate
 * Portal (Sprint 2, Phases 23/24). Deliberately independent of NextAuth --
 * staff/admin auth is a completely separate system (see authOptions.ts).
 * No passwords anywhere: a company/candidate proves ownership of their
 * email once via a short-lived one-time link, then gets a signed,
 * long-lived session cookie.
 *
 * One module serves both subject types rather than duplicating this
 * security-critical code path twice -- doubling the code doubles the
 * chance of a subtle bug existing in one copy but not the other.
 */

export type PortalSubjectType = 'company' | 'candidate';

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // one-time email link: 15 minutes
const SESSION_TTL_S = 7 * 24 * 60 * 60;    // signed session cookie: 7 days

export const PORTAL_COOKIE_NAMES: Record<PortalSubjectType, string> = {
  company: 'company_portal_session',
  candidate: 'candidate_portal_session',
};

function getSessionSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret) {
    throw new Error('PORTAL_SESSION_SECRET is not set -- portal auth cannot issue or verify sessions.');
  }
  return secret;
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ── One-time login token (the emailed magic link) ──────────────────────────

/**
 * Issues a one-time login token for a subject and persists only its hash.
 * The raw token is returned so the caller can email it -- it is never
 * stored anywhere and cannot be recovered from the database.
 */
export async function issueLoginToken(
  subjectType: PortalSubjectType,
  subjectId: string,
  email: string,
): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS).toISOString();

  const { error } = await supabase.from('portal_login_tokens').insert({
    token_hash: tokenHash,
    subject_type: subjectType,
    subject_id: subjectId,
    email,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to issue portal login token: ${error.message}`);

  return raw;
}

export interface ConsumedToken {
  subjectType: PortalSubjectType;
  subjectId: string;
  email: string;
}

/**
 * Consumes a one-time login token. Single-use is enforced atomically at
 * the DB layer (`used_at IS NULL` in the same UPDATE) rather than a
 * check-then-read-then-write in application code, so two concurrent
 * requests replaying the same link can never both succeed -- the same
 * first-mover-wins pattern used for B2B lead claiming.
 */
export async function consumeLoginToken(rawToken: string): Promise<ConsumedToken | null> {
  const tokenHash = hashToken(rawToken);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('portal_login_tokens')
    .update({ used_at: nowIso })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .gt('expires_at', nowIso)
    .select('subject_type, subject_id, email')
    .maybeSingle();

  if (error) {
    console.error('[portalAuth] consumeLoginToken error:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    subjectType: data.subject_type as PortalSubjectType,
    subjectId: data.subject_id as string,
    email: data.email as string,
  };
}

// ── Signed session token (the long-lived cookie, post-login) ───────────────

/**
 * Creates an HMAC-signed session token. Deliberately hand-rolled with
 * Node's built-in crypto rather than adding a JWT library dependency --
 * follows the same lightweight-crypto convention already established by
 * apiSecurity.ts's secureCompare(), and keeps the auditable surface area
 * to one small function instead of a general-purpose JWT library's much
 * larger attack surface.
 */
export function createSessionToken(subjectType: PortalSubjectType, subjectId: string): string {
  const payload = JSON.stringify({
    subjectType,
    subjectId,
    exp: Date.now() + SESSION_TTL_S * 1000,
  });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', getSessionSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a session token's signature and expiry, and confirms it was
 * issued for the expected subject type -- a candidate session token must
 * never be accepted by a company-portal route or vice versa, even though
 * they're signed with the same secret.
 */
export function verifySessionToken(
  token: string | undefined | null,
  expectedType: PortalSubjectType,
): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  const expectedSignature = createHmac('sha256', getSessionSecret()).update(payloadB64).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload: { subjectType?: string; subjectId?: string; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.subjectType !== expectedType) return null;
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  if (typeof payload.subjectId !== 'string' || !payload.subjectId) return null;

  return payload.subjectId;
}

// ── Cookie helpers (Route Handlers / Server Components only) ───────────────

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_S,
  };
}

/** Reads and verifies the current request's portal session cookie, if any. */
export async function getPortalSubjectId(subjectType: PortalSubjectType): Promise<string | null> {
  const store = await cookies();
  const token = store.get(PORTAL_COOKIE_NAMES[subjectType])?.value;
  return verifySessionToken(token, subjectType);
}
