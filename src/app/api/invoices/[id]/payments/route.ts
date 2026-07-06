import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { getInvoiceById, getPaymentsByInvoiceId, recordInvoicePayment } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';
import type { PaymentMethod } from '@/types';

const VALID_METHODS: PaymentMethod[] = ['bank_transfer', 'kbzpay', 'wavepay', 'cash', 'other'];

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const payments = await getPaymentsByInvoiceId(id);
  return Response.json(payments, { headers: { 'Cache-Control': 'no-store' } });
}

// POST /api/invoices/[id]/payments — "Record Payment" (manual reconciliation).
// Body: { amountMmk: number, method: PaymentMethod, paidAt?: string (YYYY-MM-DD), notes?: string }
// Inserts a payment row and flips the invoice to 'Paid', atomically (see
// record_invoice_payment, migration 0026). No external payment gateway is
// called here -- this only records that money was collected some other way
// (bank transfer / KBZPay / WavePay confirmed manually / cash).
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const invoice = await getInvoiceById(id);
  if (!invoice) return Response.json({ error: 'Invoice not found.' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { amountMmk, method, paidAt, notes } = body as Record<string, unknown>;

  if (typeof amountMmk !== 'number' || !Number.isFinite(amountMmk) || amountMmk <= 0) {
    return Response.json({ error: 'amountMmk must be a positive number' }, { status: 422 });
  }
  if (typeof method !== 'string' || !VALID_METHODS.includes(method as PaymentMethod)) {
    return Response.json({ error: `method must be one of: ${VALID_METHODS.join(', ')}` }, { status: 422 });
  }
  if (paidAt !== undefined && (typeof paidAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(paidAt))) {
    return Response.json({ error: 'paidAt must be YYYY-MM-DD' }, { status: 422 });
  }
  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
    return Response.json({ error: 'notes must be a string under 500 characters' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const recordedBy = session?.user?.email;
  if (!recordedBy) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const paymentId = await recordInvoicePayment({
      invoiceId:  id,
      amountMmk,
      method:     method as PaymentMethod,
      paidAt:     (paidAt as string) ?? new Date().toISOString().slice(0, 10),
      recordedBy,
      notes:      (notes as string) ?? null,
    });

    await logAudit({ action: 'update', domain: 'billing', entityType: 'invoice', entityId: id });

    return Response.json({ ok: true, paymentId }, { status: 201 });
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/invoices/[id]/payments',
      message:  'Could not record payment',
      error:    err,
      context:  { invoiceId: id },
    });
    return Response.json({ error: 'Could not record payment.' }, { status: 502 });
  }
}
