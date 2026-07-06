import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockRequireTabAccess,
  mockCreateContactUnlockInvoice,
  mockResolveSystemEvent,
  mockGetAgencySettings,
  mockLogAudit,
  mockLogFailure,
  mockGetServerSession,
} = vi.hoisted(() => ({
  mockRequireTabAccess:          vi.fn(),
  mockCreateContactUnlockInvoice: vi.fn(),
  mockResolveSystemEvent:        vi.fn(),
  mockGetAgencySettings:         vi.fn(),
  mockLogAudit:                  vi.fn(),
  mockLogFailure:                vi.fn(),
  mockGetServerSession:          vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireTabAccess: mockRequireTabAccess }));
vi.mock('@/lib/db', () => ({
  createContactUnlockInvoice: mockCreateContactUnlockInvoice,
  resolveSystemEvent:         mockResolveSystemEvent,
  getAgencySettings:          mockGetAgencySettings,
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

import { POST } from './route';

function makeRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}
const CTX = { params: Promise.resolve({ id: 'evt-1' }) };

const VALID_BODY = {
  applicationId: 'ap-1', companyId: 'co-1', companyName: 'Acme Ltd',
  candidateName: 'Jane Doe', jobTitle: 'Engineer',
};
const SAMPLE_INVOICE = { id: 'inv-1', invoiceNumber: 'INV-00001' };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTabAccess.mockResolvedValue(true);
  mockGetServerSession.mockResolvedValue({ user: { email: 'staff@lionjobs.test' } });
  mockGetAgencySettings.mockResolvedValue({ contactUnlockPriceMmk: 5000 });
  mockCreateContactUnlockInvoice.mockResolvedValue(SAMPLE_INVOICE);
});

describe('POST /api/contact-unlock-requests/[id]/approve', () => {
  it('rejects a caller without billing-manage access', async () => {
    mockRequireTabAccess.mockResolvedValue(false);
    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(401);
    expect(mockCreateContactUnlockInvoice).not.toHaveBeenCalled();
  });

  it('rejects a missing required field', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, jobTitle: undefined }), CTX);
    expect(res.status).toBe(422);
  });

  it('rejects when there is no authenticated session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(401);
    expect(mockCreateContactUnlockInvoice).not.toHaveBeenCalled();
  });

  it('creates the invoice, resolves the request, and logs the audit on success', async () => {
    const res = await POST(makeRequest(VALID_BODY), CTX);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ ok: true, invoice: SAMPLE_INVOICE });
    expect(mockCreateContactUnlockInvoice).toHaveBeenCalledWith({
      applicationId: 'ap-1', companyId: 'co-1', companyName: 'Acme Ltd',
      candidateName: 'Jane Doe', jobTitle: 'Engineer', priceMmk: 5000,
    });
    expect(mockResolveSystemEvent).toHaveBeenCalledWith('evt-1', 'staff@lionjobs.test');
    expect(mockLogAudit).toHaveBeenCalled();
  });

  it('returns 502 and logs the failure when invoice creation throws', async () => {
    mockCreateContactUnlockInvoice.mockRejectedValue(new Error('db unreachable'));
    const res = await POST(makeRequest(VALID_BODY), CTX);
    expect(res.status).toBe(502);
    expect(mockResolveSystemEvent).not.toHaveBeenCalled();
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Could not approve contact unlock request' }),
    );
  });
});
