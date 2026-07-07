import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Fast-Track Visibility opt-in campaign (2026-07-07): a signed, stateless
 * magic link for a one-off "grant consent" email action, deliberately
 * separate from portalAuth.ts's login/session tokens. Reuses the same
 * PORTAL_SESSION_SECRET (not a new secret) but a distinct `purpose`
 * discriminator, so a link minted here can never be replayed as a portal
 * session token or vice versa even though both are HMAC'd with the same
 * key. Hand-rolled with Node's built-in crypto, same convention as
 * portalAuth.ts's own tokens, rather than adding a JWT dependency.
 *
 * 30-day TTL, much longer than a login link's 15 minutes -- this is an
 * email campaign a recipient might not open for days or weeks, not a
 * "click now to sign in" flow.
 */

const OPT_IN_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.PORTAL_SESSION_SECRET;
  if (!secret) {
    throw new Error('PORTAL_SESSION_SECRET is not set -- consent links cannot be issued or verified.');
  }
  return secret;
}

export function createDirectContactOptInToken(candidateId: string): string {
  const payload = JSON.stringify({
    candidateId,
    purpose: 'direct_contact_optin',
    exp: Date.now() + OPT_IN_TOKEN_TTL_MS,
  });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyDirectContactOptInToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;
  if (!payloadB64 || !signature) return null;

  const expectedSignature = createHmac('sha256', getSecret()).update(payloadB64).digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload: { candidateId?: string; purpose?: string; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (payload.purpose !== 'direct_contact_optin') return null;
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  if (typeof payload.candidateId !== 'string' || !payload.candidateId) return null;

  return payload.candidateId;
}
