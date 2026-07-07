import { describe, it, expect, beforeAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { createDirectContactOptInToken, verifyDirectContactOptInToken } from './consentLinks';

beforeAll(() => {
  process.env.PORTAL_SESSION_SECRET = 'test-secret-do-not-use-in-prod';
});

describe('consentLinks (Fast-Track Visibility opt-in tokens)', () => {
  it('round-trips a valid token back to its candidateId', () => {
    const token = createDirectContactOptInToken('cd-123');
    expect(verifyDirectContactOptInToken(token)).toBe('cd-123');
  });

  it('rejects a missing token', () => {
    expect(verifyDirectContactOptInToken(null)).toBeNull();
    expect(verifyDirectContactOptInToken(undefined)).toBeNull();
    expect(verifyDirectContactOptInToken('')).toBeNull();
  });

  it('rejects a malformed token (no signature segment)', () => {
    expect(verifyDirectContactOptInToken('not-a-real-token')).toBeNull();
  });

  it('rejects a token with a tampered payload', () => {
    const token = createDirectContactOptInToken('cd-123');
    const [payloadB64, signature] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ candidateId: 'cd-999', purpose: 'direct_contact_optin', exp: Date.now() + 1_000_000 }), 'utf8').toString('base64url');
    expect(verifyDirectContactOptInToken(`${tamperedPayload}.${signature}`)).toBeNull();
    expect(payloadB64).not.toBe(tamperedPayload);
  });

  it('rejects a token with a tampered signature', () => {
    const token = createDirectContactOptInToken('cd-123');
    const [payloadB64] = token.split('.');
    expect(verifyDirectContactOptInToken(`${payloadB64}.wrongsignature`)).toBeNull();
  });

  it('rejects an expired token', () => {
    // Can't fast-forward real time here (Date.now() is used internally),
    // so this constructs an already-expired token directly rather than
    // waiting 30 days -- same technique as forging the tampered-payload
    // test above, just with exp in the past.
    const payload = JSON.stringify({ candidateId: 'cd-123', purpose: 'direct_contact_optin', exp: Date.now() - 1000 });
    const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
    const signature = createHmac('sha256', process.env.PORTAL_SESSION_SECRET!).update(payloadB64).digest('base64url');
    expect(verifyDirectContactOptInToken(`${payloadB64}.${signature}`)).toBeNull();
  });

  it('rejects a token signed for a different purpose', () => {
    const payload = JSON.stringify({ candidateId: 'cd-123', purpose: 'something_else', exp: Date.now() + 1_000_000 });
    const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
    const signature = createHmac('sha256', process.env.PORTAL_SESSION_SECRET!).update(payloadB64).digest('base64url');
    expect(verifyDirectContactOptInToken(`${payloadB64}.${signature}`)).toBeNull();
  });
});
