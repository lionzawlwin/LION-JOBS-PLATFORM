import { supabase } from '@/lib/supabase';
import type { Payment, PaymentMethod } from '@/types';

function mapToPayment(row: Record<string, unknown>): Payment {
  return {
    id:         row.id as string,
    invoiceId:  row.invoice_id as string,
    amountMmk:  Number(row.amount_mmk),
    method:     row.method as PaymentMethod,
    paidAt:     row.paid_at as string,
    recordedBy: row.recorded_by as string,
    notes:      (row.notes as string) ?? null,
    createdAt:  row.created_at as string,
  };
}

export async function getPaymentsByInvoiceId(invoiceId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('[db/payments] getPaymentsByInvoiceId error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToPayment);
}

// Calls the record_invoice_payment Postgres function (migration 0026) so the
// payment row and the invoice's flip to 'Paid' land in one transaction --
// never separately, same reasoning as rolePermissions.ts's
// set_role_permission call. Caller (the API route) validates amount/method
// before calling this -- this function trusts its inputs, matching every
// other db/*.ts accessor's contract in this app.
export async function recordInvoicePayment(params: {
  invoiceId:  string;
  amountMmk:  number;
  method:     PaymentMethod;
  paidAt:     string;
  recordedBy: string;
  notes:      string | null;
}): Promise<string> {
  const paymentId = `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabase.rpc('record_invoice_payment', {
    p_payment_id:  paymentId,
    p_invoice_id:  params.invoiceId,
    p_amount_mmk:  params.amountMmk,
    p_method:      params.method,
    p_paid_at:     params.paidAt,
    p_recorded_by: params.recordedBy,
    p_notes:       params.notes,
  });
  if (error) throw new Error(`Failed to record payment: ${error.message}`);
  return data as string;
}
