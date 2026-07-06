import { describe, it, expect, vi, beforeEach } from 'vitest';

// CTO Technical Audit Phase 7. The real enforcement boundary for
// isInvoiceableCompany() (companyRules.ts) -- blocking invoice creation
// for the repo owner's own internal F&B brands -- lives here, at the
// route level. companyRules.test.ts proves the pure function's logic;
// this proves the route actually calls it and turns a false result into
// a 422 rather than silently creating the invoice anyway.

const {
  mockRequireTabAccess,
  mockGetInvoiceByApplicationId,
  mockGetCompanyById,
  mockGetAgencySettings,
  mockCreateInvoice,
  mockSendInvoiceIssuedEmail,
  mockLogAudit,
  mockLogFailure,
} = vi.hoisted(() => ({
  mockRequireTabAccess:         vi.fn(),
  mockGetInvoiceByApplicationId: vi.fn(),
  mockGetCompanyById:           vi.fn(),
  mockGetAgencySettings:        vi.fn(),
  mockCreateInvoice:            vi.fn(),
  mockSendInvoiceIssuedEmail:   vi.fn(),
  mockLogAudit:                 vi.fn(),
  mockLogFailure:               vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireTabAccess: mockRequireTabAccess }));
vi.mock('@/lib/db', () => ({
  getInvoices:                vi.fn(),
  getInvoiceByApplicationId:  mockGetInvoiceByApplicationId,
  createInvoice:              mockCreateInvoice,
  getCompanyById:             mockGetCompanyById,
  getAgencySettings:          mockGetAgencySettings,
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));
vi.mock('@/lib/portalEmail', () => ({ sendInvoiceIssuedEmail: mockSendInvoiceIssuedEmail }));

import { POST } from './route';

function makeRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const VALID_BODY = {
  applicationId: 'ap-1', candidateName: 'Jane Doe', position: 'Engineer',
  companyId: 'co-1', agreedSalary: 1_000_000,
};

const INTERNAL_COMPANY = { id: 'co-1', name: 'Cheesy Bites', isInternal: true, email: null, commissionRatePct: null };
const NORMAL_COMPANY   = { id: 'co-1', name: 'Acme Ltd',     isInternal: false, email: 'hr@acme.test', commissionRatePct: null };
const SAMPLE_INVOICE   = { id: 'inv-1', invoiceNumber: 'INV-00001', position: 'Engineer', commissionFeeMmk: 600000 };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTabAccess.mockResolvedValue(true);
  mockGetInvoiceByApplicationId.mockResolvedValue(null);
  mockGetCompanyById.mockResolvedValue(NORMAL_COMPANY);
  mockGetAgencySettings.mockResolvedValue({ defaultCommissionRatePct: 60 });
  mockCreateInvoice.mockResolvedValue(SAMPLE_INVOICE);
  mockSendInvoiceIssuedEmail.mockResolvedValue(undefined);
});

describe('POST /api/invoices', () => {
  it('rejects a caller without billing-manage access', async () => {
    mockRequireTabAccess.mockResolvedValue(false);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('rejects a missing required field', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, companyId: undefined }));
    expect(res.status).toBe(422);
  });

  it('rejects a non-positive agreedSalary', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, agreedSalary: 0 }));
    expect(res.status).toBe(422);
  });

  it('returns 409 with the existing invoice id when one already exists for the application', async () => {
    mockGetInvoiceByApplicationId.mockResolvedValue({ id: 'inv-existing' });
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();
    expect(res.status).toBe(409);
    expect(json.invoiceId).toBe('inv-existing');
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('returns 404 for a nonexistent company', async () => {
    mockGetCompanyById.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  // The actual enforcement boundary this test file exists for.
  it('blocks invoice creation for an internal company', async () => {
    mockGetCompanyById.mockResolvedValue(INTERNAL_COMPANY);
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.error).toMatch(/internal company/i);
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it('creates the invoice and sends the notification for a normal company', async () => {
    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual(SAMPLE_INVOICE);
    expect(mockCreateInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'co-1', companyName: 'Acme Ltd', agreedSalary: 1_000_000 }),
    );
    expect(mockSendInvoiceIssuedEmail).toHaveBeenCalled();
    expect(mockLogAudit).toHaveBeenCalled();
  });

  it('still returns 201 when the notification email fails to send', async () => {
    mockSendInvoiceIssuedEmail.mockRejectedValue(new Error('resend down'));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('notification email failed') }),
    );
  });

  it('does not attempt to send a notification when the company has no email on file', async () => {
    mockGetCompanyById.mockResolvedValue({ ...NORMAL_COMPANY, email: null });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
    expect(mockSendInvoiceIssuedEmail).not.toHaveBeenCalled();
  });

  it('returns 502 if invoice creation itself throws', async () => {
    mockCreateInvoice.mockRejectedValue(new Error('db unreachable'));
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
  });
});
