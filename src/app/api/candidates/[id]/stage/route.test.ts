import { describe, it, expect, vi, beforeEach } from 'vitest';

// CTO overnight roadmap session (2026-07-07). Proves the route's own
// notification-gating logic -- only Shortlisted/Interview/Hired, only on
// a real transition, only when the candidate has an email on file, and
// that a failed send never turns a successful stage update into an error
// response -- not just that updateCandidateStage()/sendCandidateStageChangeEmail()
// are individually correct in isolation.

const {
  mockRequireTabAccess,
  mockUpdateCandidateStage,
  mockLogAudit,
  mockLogFailure,
  mockSendCandidateStageChangeEmail,
} = vi.hoisted(() => ({
  mockRequireTabAccess:               vi.fn(),
  mockUpdateCandidateStage:           vi.fn(),
  mockLogAudit:                       vi.fn(),
  mockLogFailure:                    vi.fn(),
  mockSendCandidateStageChangeEmail: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireTabAccess: mockRequireTabAccess }));
vi.mock('@/lib/db', () => ({ updateCandidateStage: mockUpdateCandidateStage }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));
vi.mock('@/lib/portalEmail', () => ({ sendCandidateStageChangeEmail: mockSendCandidateStageChangeEmail }));

import { PATCH } from './route';

function makeRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof PATCH>[0];
}
const CTX = { params: Promise.resolve({ id: 'app-1' }) };

const RESULT = {
  previousStage:  'Applied' as const,
  candidateName:  'Jane Doe',
  candidateEmail: 'jane@example.com',
  jobTitle:       'Engineer',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTabAccess.mockResolvedValue(true);
  mockUpdateCandidateStage.mockResolvedValue(RESULT);
  mockSendCandidateStageChangeEmail.mockResolvedValue(undefined);
});

describe('PATCH /api/candidates/[id]/stage', () => {
  it('rejects a caller without candidates-manage access', async () => {
    mockRequireTabAccess.mockResolvedValue(false);
    const res = await PATCH(makeRequest({ stage: 'Shortlisted' }), CTX);
    expect(res.status).toBe(401);
    expect(mockUpdateCandidateStage).not.toHaveBeenCalled();
  });

  it('rejects an invalid stage value', async () => {
    const res = await PATCH(makeRequest({ stage: 'Withdrawn' }), CTX);
    expect(res.status).toBe(422);
    expect(mockUpdateCandidateStage).not.toHaveBeenCalled();
  });

  it('sends a stage-change email on a real transition into a notifiable stage', async () => {
    const res = await PATCH(makeRequest({ stage: 'Shortlisted' }), CTX);
    expect(res.status).toBe(200);
    expect(mockSendCandidateStageChangeEmail).toHaveBeenCalledWith({
      to: 'jane@example.com',
      candidateName: 'Jane Doe',
      jobTitle: 'Engineer',
      stage: 'Shortlisted',
    });
  });

  it('does not send an email for a transition to Applied', async () => {
    await PATCH(makeRequest({ stage: 'Applied' }), CTX);
    expect(mockSendCandidateStageChangeEmail).not.toHaveBeenCalled();
  });

  it('does not send a duplicate email when the stage did not actually change', async () => {
    mockUpdateCandidateStage.mockResolvedValue({ ...RESULT, previousStage: 'Shortlisted' });
    await PATCH(makeRequest({ stage: 'Shortlisted' }), CTX);
    expect(mockSendCandidateStageChangeEmail).not.toHaveBeenCalled();
  });

  it('does not attempt to send when the candidate has no email on file', async () => {
    mockUpdateCandidateStage.mockResolvedValue({ ...RESULT, candidateEmail: null });
    await PATCH(makeRequest({ stage: 'Shortlisted' }), CTX);
    expect(mockSendCandidateStageChangeEmail).not.toHaveBeenCalled();
  });

  it('still returns success and logs the failure when the email send throws', async () => {
    mockSendCandidateStageChangeEmail.mockRejectedValue(new Error('Resend down'));
    const res = await PATCH(makeRequest({ stage: 'Shortlisted' }), CTX);
    expect(res.status).toBe(200);
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Failed to send stage-change email' }),
    );
  });

  it('does not send an email when updateCandidateStage returns null (fake application id)', async () => {
    mockUpdateCandidateStage.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ stage: 'Shortlisted' }), CTX);
    expect(res.status).toBe(200);
    expect(mockSendCandidateStageChangeEmail).not.toHaveBeenCalled();
  });
});
