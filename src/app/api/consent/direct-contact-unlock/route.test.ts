import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockVerifyDirectContactOptInToken,
  mockGrantDirectContactConsentForAllApplications,
  mockLogFailure,
} = vi.hoisted(() => ({
  mockVerifyDirectContactOptInToken:              vi.fn(),
  mockGrantDirectContactConsentForAllApplications: vi.fn(),
  mockLogFailure:                                 vi.fn(),
}));

vi.mock('@/lib/consentLinks', () => ({ verifyDirectContactOptInToken: mockVerifyDirectContactOptInToken }));
vi.mock('@/lib/db', () => ({ grantDirectContactConsentForAllApplications: mockGrantDirectContactConsentForAllApplications }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));

import { GET } from './route';

function makeRequest(token: string | null) {
  const url = new URL('https://lion-jobs-platform.vercel.app/api/consent/direct-contact-unlock');
  if (token !== null) url.searchParams.set('token', token);
  return { nextUrl: url, url: url.toString() } as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGrantDirectContactConsentForAllApplications.mockResolvedValue(2);
});

describe('GET /api/consent/direct-contact-unlock', () => {
  it('redirects to status=invalid for a missing token', async () => {
    mockVerifyDirectContactOptInToken.mockReturnValue(null);
    const res = await GET(makeRequest(null));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('status=invalid');
    expect(mockGrantDirectContactConsentForAllApplications).not.toHaveBeenCalled();
  });

  it('redirects to status=invalid for an invalid/expired token', async () => {
    mockVerifyDirectContactOptInToken.mockReturnValue(null);
    const res = await GET(makeRequest('garbage'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('status=invalid');
  });

  it('grants consent and redirects to status=success for a valid token', async () => {
    mockVerifyDirectContactOptInToken.mockReturnValue('cd-123');
    const res = await GET(makeRequest('valid-token'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('status=success');
    expect(mockGrantDirectContactConsentForAllApplications).toHaveBeenCalledWith('cd-123');
  });

  it('redirects to status=error and logs the failure when granting consent throws', async () => {
    mockVerifyDirectContactOptInToken.mockReturnValue('cd-123');
    mockGrantDirectContactConsentForAllApplications.mockRejectedValue(new Error('db unreachable'));
    const res = await GET(makeRequest('valid-token'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('status=error');
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Failed to grant direct contact consent') }),
    );
  });
});
