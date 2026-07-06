import { describe, it, expect, vi, beforeEach } from 'vitest';

// CTO Technical Audit Phase 7: this repo's first route-handler-level
// integration test. Everything so far tested pure lib functions in
// isolation (permissions.ts, cseScope.ts, algorithmicMatch.ts, etc.) or a
// single DB accessor (candidates.applicantVisibility.test.ts) -- nothing
// exercised an actual Route Handler's control flow. This is the highest-
// risk route in the app to leave completely untested: it records money
// received and triggers the paid-invoice activation side effects
// (Featured Placement / Job Boost) documented as "best-effort, must never
// surface as a payment failure" in the route's own comments -- that
// invariant had zero test coverage proving it actually holds.

const {
  mockRequireTabAccess,
  mockGetInvoiceById,
  mockGetPaymentsByInvoiceId,
  mockRecordInvoicePayment,
  mockActivateFeaturedPlacementIfPaid,
  mockActivateJobBoostIfPaid,
  mockActivateContactUnlockIfPaid,
  mockLogAudit,
  mockLogFailure,
  mockGetServerSession,
} = vi.hoisted(() => ({
  mockRequireTabAccess:                 vi.fn(),
  mockGetInvoiceById:                   vi.fn(),
  mockGetPaymentsByInvoiceId:           vi.fn(),
  mockRecordInvoicePayment:             vi.fn(),
  mockActivateFeaturedPlacementIfPaid:  vi.fn(),
  mockActivateJobBoostIfPaid:           vi.fn(),
  mockActivateContactUnlockIfPaid:      vi.fn(),
  mockLogAudit:                         vi.fn(),
  mockLogFailure:                       vi.fn(),
  mockGetServerSession:                 vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ requireTabAccess: mockRequireTabAccess }));
vi.mock('@/lib/db', () => ({
  getInvoiceById:                        mockGetInvoiceById,
  getPaymentsByInvoiceId:                mockGetPaymentsByInvoiceId,
  recordInvoicePayment:                  mockRecordInvoicePayment,
  activateFeaturedPlacementIfInvoicePaid: mockActivateFeaturedPlacementIfPaid,
  activateJobBoostIfInvoicePaid:          mockActivateJobBoostIfPaid,
  activateContactUnlockIfInvoicePaid:     mockActivateContactUnlockIfPaid,
}));
vi.mock('@/lib/audit', () => ({ logAudit: mockLogAudit }));
vi.mock('@/lib/observability', () => ({ logFailure: mockLogFailure }));
vi.mock('next-auth', () => ({ getServerSession: mockGetServerSession }));
vi.mock('@/lib/authOptions', () => ({ authOptions: {} }));

import { POST } from './route';

function makeRequest(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const VALID_BODY = { amountMmk: 50000, method: 'bank_transfer' as const };
const CONTEXT = { params: Promise.resolve({ id: 'inv-1' }) };

const SAMPLE_INVOICE = {
  id: 'inv-1', companyId: 'co-1', invoiceNumber: 'INV-00001',
  chargeType: 'featured_placement', metadata: { durationDays: 30 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireTabAccess.mockResolvedValue(true);
  mockGetInvoiceById.mockResolvedValue(SAMPLE_INVOICE);
  mockRecordInvoicePayment.mockResolvedValue('pay-1');
  mockGetServerSession.mockResolvedValue({ user: { email: 'staff@lionjobs.test' } });
  mockActivateFeaturedPlacementIfPaid.mockResolvedValue(undefined);
  mockActivateJobBoostIfPaid.mockResolvedValue(undefined);
  mockActivateContactUnlockIfPaid.mockResolvedValue(undefined);
});

describe('POST /api/invoices/[id]/payments', () => {
  it('rejects a caller without billing-manage access', async () => {
    mockRequireTabAccess.mockResolvedValue(false);
    const res = await POST(makeRequest(VALID_BODY), CONTEXT);
    expect(res.status).toBe(401);
    expect(mockRecordInvoicePayment).not.toHaveBeenCalled();
  });

  it('returns 404 for a nonexistent invoice', async () => {
    mockGetInvoiceById.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY), CONTEXT);
    expect(res.status).toBe(404);
  });

  it('rejects a non-positive amountMmk', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, amountMmk: 0 }), CONTEXT);
    expect(res.status).toBe(422);
    expect(mockRecordInvoicePayment).not.toHaveBeenCalled();
  });

  it('rejects an unrecognized payment method', async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, method: 'crypto' }), CONTEXT);
    expect(res.status).toBe(422);
  });

  it('rejects when there is no authenticated session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest(VALID_BODY), CONTEXT);
    expect(res.status).toBe(401);
    expect(mockRecordInvoicePayment).not.toHaveBeenCalled();
  });

  it('records the payment and runs all activation side effects on success', async () => {
    const res = await POST(makeRequest(VALID_BODY), CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({ ok: true, paymentId: 'pay-1' });
    expect(mockRecordInvoicePayment).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId: 'inv-1', amountMmk: 50000, method: 'bank_transfer' }),
    );
    expect(mockActivateFeaturedPlacementIfPaid).toHaveBeenCalledWith(SAMPLE_INVOICE);
    expect(mockActivateJobBoostIfPaid).toHaveBeenCalledWith(SAMPLE_INVOICE);
    expect(mockActivateContactUnlockIfPaid).toHaveBeenCalledWith(SAMPLE_INVOICE);
    expect(mockLogAudit).toHaveBeenCalled();
  });

  // The route's own comment: "the payment itself is already recorded and
  // committed at this point, so a failure here must never surface as
  // 'payment failed' to the caller." This is the one property in this
  // route worth a dedicated test -- it's a correctness invariant, not an
  // incidental detail.
  it('still reports the payment as successful when an activation side effect throws', async () => {
    mockActivateFeaturedPlacementIfPaid.mockRejectedValue(new Error('activation exploded'));

    const res = await POST(makeRequest(VALID_BODY), CONTEXT);
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({ ok: true, paymentId: 'pay-1' });
    expect(mockLogFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('activation failed') }),
    );
  });

  it('returns 502 if recording the payment itself fails', async () => {
    mockRecordInvoicePayment.mockRejectedValue(new Error('db unreachable'));
    const res = await POST(makeRequest(VALID_BODY), CONTEXT);
    expect(res.status).toBe(502);
    expect(mockActivateFeaturedPlacementIfPaid).not.toHaveBeenCalled();
  });
});
