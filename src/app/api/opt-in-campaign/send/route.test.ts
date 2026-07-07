import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireTabAccess,
  mockGetNextOptInCampaignBatch,
  mockMarkOptInCampaignSent,
  mockGetOptInCampaignStats,
  mockSendDirectContactOptInEmail,
  mockCreateDirectContactOptInToken,
  mockLogFailure,
  mockLogAudit,
} = vi.hoisted(() => ({
  mockRequireTabAccess:               vi.fn(),
  mockGetNextOptInCampaignBatch:      vi.fn(),
  mockMarkOptInCampaignSent:          vi.fn(),
  mockGetOptInCampaignStats:          vi.fn(),
  mockSendDirectContactOptInEmail:    vi.fn(),
  mockCreateDirectContactOptInToken:  vi.fn(),
  mockLogFailure:                     vi.fn(),
  mockLogAudit:                       vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireTabAccess: mockRequireTabAccess }));
vi.mock('@/lib/db', () => ({
  getNextOptInCampaignBatch: mockGetNextOptInCampaignBatch,
  markOptInCampaignSent:     mockMarkOptInCampaignSent,
  getOptInCampaignStats:     mockGetOptInCampaignStats,
}));
vi.mock('@/lib/portalEmail', () => ({ sendDirectContactOptInEmail: mockSendDirectContactOptInEmail }));
vi.mock('@/lib/consentLinks', () => ({ createDirectContactOptInToken: mockCreateDirectContactOptInToken }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));

import { POST } from './route';

function makeRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const CANDIDATES = [
  { candidateId: 'cd-1', name: 'Jane Doe', email: 'jane@example.com' },
  { candidateId: 'cd-2', name: 'John Roe', email: 'john@example.com' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTabAccess.mockResolvedValue(true);
  mockGetNextOptInCampaignBatch.mockResolvedValue(CANDIDATES);
  mockCreateDirectContactOptInToken.mockReturnValue('signed-token');
  mockSendDirectContactOptInEmail.mockResolvedValue(undefined);
  mockMarkOptInCampaignSent.mockResolvedValue(undefined);
  mockGetOptInCampaignStats.mockResolvedValue({ eligible: 3, sent: 2 });
});

describe('POST /api/opt-in-campaign/send', () => {
  it('rejects a caller without billing-manage access', async () => {
    mockRequireTabAccess.mockResolvedValue(false);
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(401);
    expect(mockGetNextOptInCampaignBatch).not.toHaveBeenCalled();
  });

  it('sends every candidate in the batch and marks each sent', async () => {
    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(json).toEqual({ sent: 2, failed: 0, eligible: 3, totalSent: 2 });
    expect(mockSendDirectContactOptInEmail).toHaveBeenCalledTimes(2);
    expect(mockMarkOptInCampaignSent).toHaveBeenCalledWith('cd-1');
    expect(mockMarkOptInCampaignSent).toHaveBeenCalledWith('cd-2');
    expect(mockLogAudit).toHaveBeenCalled();
  });

  it('caps an oversized requested batchSize rather than trusting it unbounded', async () => {
    await POST(makeRequest({ batchSize: 999999 }));
    expect(mockGetNextOptInCampaignBatch).toHaveBeenCalledWith(100);
  });

  it('continues sending the rest of the batch when one candidate fails, and does not mark them sent', async () => {
    mockSendDirectContactOptInEmail
      .mockRejectedValueOnce(new Error('Resend down'))
      .mockResolvedValueOnce(undefined);

    const res = await POST(makeRequest({}));
    const json = await res.json();

    expect(json.sent).toBe(1);
    expect(json.failed).toBe(1);
    expect(mockMarkOptInCampaignSent).toHaveBeenCalledTimes(1);
    expect(mockMarkOptInCampaignSent).toHaveBeenCalledWith('cd-2');
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ context: { candidateId: 'cd-1' } }),
    );
  });

  it('handles an empty batch (nothing left to send) without error', async () => {
    mockGetNextOptInCampaignBatch.mockResolvedValue([]);
    const res = await POST(makeRequest({}));
    const json = await res.json();
    expect(json.sent).toBe(0);
    expect(json.failed).toBe(0);
    expect(mockLogAudit).not.toHaveBeenCalled();
  });
});
