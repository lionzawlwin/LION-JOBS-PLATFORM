import { describe, it, expect, vi, beforeEach } from 'vitest';

// Direct-Contact-Info Upsell Tier (2026-07-07). Proves this route's own
// enforcement chain: not-signed-in, job ownership, applicant lookup,
// consent-required, and already-requested/unlocked -- getApplicantsForJob()
// itself already has dedicated privacy-boundary tests
// (candidates.applicantVisibility.test.ts), so this stays scoped to what
// only the route does with that data.

const {
  mockGetPortalSubjectId,
  mockGetCompanyById,
  mockGetJobById,
  mockGetApplicantsForJob,
  mockGetAgencySettings,
  mockAppendSystemEvent,
  mockCreateContactUnlockRequest,
} = vi.hoisted(() => ({
  mockGetPortalSubjectId:        vi.fn(),
  mockGetCompanyById:            vi.fn(),
  mockGetJobById:                vi.fn(),
  mockGetApplicantsForJob:       vi.fn(),
  mockGetAgencySettings:         vi.fn(),
  mockAppendSystemEvent:         vi.fn(),
  mockCreateContactUnlockRequest: vi.fn(),
}));

vi.mock('@/lib/portalAuth', () => ({ getPortalSubjectId: mockGetPortalSubjectId }));
vi.mock('@/lib/db', () => ({
  getCompanyById:            mockGetCompanyById,
  getJobById:                mockGetJobById,
  getApplicantsForJob:       mockGetApplicantsForJob,
  getAgencySettings:         mockGetAgencySettings,
  appendSystemEvent:         mockAppendSystemEvent,
  createContactUnlockRequest: mockCreateContactUnlockRequest,
}));

import { POST } from './route';

function makeRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const VALID_BODY = { jobId: 'jb-1', applicationId: 'ap-1' };
const COMPANY = { id: 'co-1', name: 'Acme Ltd' };
const JOB = { id: 'jb-1', companyId: 'co-1', title: 'Engineer' };
const CONSENTED_APPLICANT = {
  id: 'ap-1', name: 'Jane Doe', stage: 'Applied', appliedAt: '2026-07-01',
  cvUrl: null, directContactConsent: true, contactUnlockStatus: 'none', phone: null, email: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPortalSubjectId.mockResolvedValue('co-1');
  mockGetCompanyById.mockResolvedValue(COMPANY);
  mockGetJobById.mockResolvedValue(JOB);
  mockGetApplicantsForJob.mockResolvedValue([CONSENTED_APPLICANT]);
  mockGetAgencySettings.mockResolvedValue({ contactUnlockPriceMmk: 5000 });
  mockCreateContactUnlockRequest.mockResolvedValue(undefined);
});

describe('POST /api/company-portal/contact-unlock-requests', () => {
  it('rejects an unauthenticated caller', async () => {
    mockGetPortalSubjectId.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mockCreateContactUnlockRequest).not.toHaveBeenCalled();
  });

  it('rejects a job the company does not own', async () => {
    mockGetJobById.mockResolvedValue({ ...JOB, companyId: 'co-other' });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
    expect(mockCreateContactUnlockRequest).not.toHaveBeenCalled();
  });

  it('rejects an applicationId not found among this job\'s applicants', async () => {
    mockGetApplicantsForJob.mockResolvedValue([{ ...CONSENTED_APPLICANT, id: 'ap-other' }]);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it('rejects when the candidate has not consented', async () => {
    mockGetApplicantsForJob.mockResolvedValue([{ ...CONSENTED_APPLICANT, directContactConsent: false }]);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(422);
    expect(mockCreateContactUnlockRequest).not.toHaveBeenCalled();
  });

  it('rejects when the applicant has already been requested or unlocked', async () => {
    mockGetApplicantsForJob.mockResolvedValue([{ ...CONSENTED_APPLICANT, contactUnlockStatus: 'paid' }]);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    expect(mockCreateContactUnlockRequest).not.toHaveBeenCalled();
  });

  it('creates the request and logs a system event on success', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true });
    expect(mockCreateContactUnlockRequest).toHaveBeenCalledWith('ap-1', 'co-1');
    expect(mockAppendSystemEvent).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'contact_unlock', context: expect.objectContaining({ applicationId: 'ap-1', companyId: 'co-1' }) }),
    );
  });

  it('reports 409 (not 500) when a race causes the unique index to reject the insert', async () => {
    mockCreateContactUnlockRequest.mockRejectedValue(new Error('duplicate key value violates unique constraint'));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(409);
    expect(mockAppendSystemEvent).not.toHaveBeenCalled();
  });
});
