import { supabase } from '@/lib/supabase';
import type { Invoice, InvoiceStatus } from '@/types';

function mapToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id:                row.id as string,
    invoiceNumber:     row.invoice_number as string,
    companyId:         (row.company_id as string) ?? null,
    companyName:       row.company_name as string,
    applicationId:     (row.application_id as string) ?? null,
    candidateName:     row.candidate_name as string,
    position:          row.position as string,
    agreedSalary:      Number(row.agreed_salary),
    commissionRatePct: Number(row.commission_rate_pct),
    commissionFeeMmk:  Number(row.commission_fee_mmk),
    status:            row.status as InvoiceStatus,
    issuedAt:          row.issued_at as string,
    createdAt:         row.created_at as string,
  };
}

export async function getInvoices(filters?: {
  companyId?: string;
  status?:    string;
}): Promise<Invoice[]> {
  let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (filters?.companyId) query = query.eq('company_id', filters.companyId);
  if (filters?.status)    query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) {
    console.error('[db/invoices] getInvoices error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapToInvoice(data);
}

export async function getInvoiceByApplicationId(applicationId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error || !data) return null;
  return mapToInvoice(data);
}

export async function createInvoice(data: {
  companyId:         string;
  companyName:       string;
  applicationId:     string;
  candidateName:     string;
  position:          string;
  agreedSalary:      number;
  commissionRatePct: number;
}): Promise<Invoice> {
  const { count, error: countError } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Failed to compute invoice number: ${countError.message}`);

  const sequence     = (count ?? 0) + 1;
  const invoiceNumber = `INV-${String(sequence).padStart(5, '0')}`;
  const id            = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const commissionFeeMmk = Math.round(data.agreedSalary * data.commissionRatePct / 100);

  const { error } = await supabase.from('invoices').insert({
    id,
    invoice_number:      invoiceNumber,
    company_id:          data.companyId,
    company_name:        data.companyName,
    application_id:      data.applicationId,
    candidate_name:      data.candidateName,
    position:            data.position,
    agreed_salary:       data.agreedSalary,
    commission_rate_pct: data.commissionRatePct,
    commission_fee_mmk:  commissionFeeMmk,
    status:              'Draft',
  });
  if (error) throw new Error(`Failed to create invoice: ${error.message}`);

  const invoice = await getInvoiceById(id);
  if (!invoice) throw new Error('Invoice created but could not be re-fetched.');
  return invoice;
}

// Batch 2, Feature 1: a separate creation path from createInvoice() above,
// deliberately -- that function is the candidate-placement commission
// flow (applicationId-keyed dedup, commissionRatePct-based fee calc via
// POST /api/invoices), and this is billing a company for a plan/tier
// upgrade, a completely different kind of charge. Reusing the same table
// (rather than a new one) since the shape -- company, amount, status,
// print/view -- is identical; only the semantics of "position" and
// "commission" differ, which is why they're plain descriptive text/100%
// here rather than a real commission calculation.
export async function createPlanUpgradeInvoice(data: {
  companyId:   string;
  companyName: string;
  planName:    string;
  priceMmk:    number;
}): Promise<Invoice> {
  const { count, error: countError } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Failed to compute invoice number: ${countError.message}`);

  const sequence      = (count ?? 0) + 1;
  const invoiceNumber = `INV-${String(sequence).padStart(5, '0')}`;
  const id            = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from('invoices').insert({
    id,
    invoice_number:      invoiceNumber,
    company_id:          data.companyId,
    company_name:        data.companyName,
    application_id:      null,
    candidate_name:      '—',
    position:            `Plan Upgrade — ${data.planName}`,
    agreed_salary:       data.priceMmk,
    commission_rate_pct: 100,
    commission_fee_mmk:  data.priceMmk,
    status:              'Draft',
  });
  if (error) throw new Error(`Failed to create plan upgrade invoice: ${error.message}`);

  const invoice = await getInvoiceById(id);
  if (!invoice) throw new Error('Invoice created but could not be re-fetched.');
  return invoice;
}

// Self-Serve Featured Placement Upsell: same non-candidate-placement
// pattern as createPlanUpgradeInvoice() above. `position` is tagged via
// featuredPlacementInvoicePosition() (companyRules.ts) -- the payments
// route reads it back with isFeaturedPlacementInvoicePosition() to decide
// whether a paid invoice should flip the company's featured flag on.
export async function createFeaturedPlacementInvoice(data: {
  companyId:   string;
  companyName: string;
  priceMmk:    number;
  position:    string;
}): Promise<Invoice> {
  const { count, error: countError } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Failed to compute invoice number: ${countError.message}`);

  const sequence      = (count ?? 0) + 1;
  const invoiceNumber = `INV-${String(sequence).padStart(5, '0')}`;
  const id            = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from('invoices').insert({
    id,
    invoice_number:      invoiceNumber,
    company_id:          data.companyId,
    company_name:        data.companyName,
    application_id:      null,
    candidate_name:      '—',
    position:            data.position,
    agreed_salary:       data.priceMmk,
    commission_rate_pct: 100,
    commission_fee_mmk:  data.priceMmk,
    status:              'Draft',
  });
  if (error) throw new Error(`Failed to create featured placement invoice: ${error.message}`);

  const invoice = await getInvoiceById(id);
  if (!invoice) throw new Error('Invoice created but could not be re-fetched.');
  return invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw new Error(`Failed to update invoice status: ${error.message}`);
}
