import { supabase } from '@/lib/supabase';
import { getInvoiceById } from '@/lib/db/invoices';
import type { Invoice, ContactUnlockStatus, ContactUnlockInvoiceMetadata } from '@/types';

// Direct-Contact-Info Upsell Tier (2026-07-07). One row per (application,
// company) -- see migration 0035's own comment for why.
//
// Unlike Featured Placement/Job Boost's "approval creates the row," this
// row is created at REQUEST time (status 'pending', invoice_id null) --
// deliberately different, because getApplicantsForJob()'s
// contactUnlockStatus is what the employer's own Unlock button reads to
// decide whether to show "Unlock" vs "Requested." If the row only
// appeared at approval, an employer could click Unlock repeatedly before
// staff ever look at the inbox, since nothing would visibly change. The
// unique index still guarantees only one row per (application, company)
// ever exists -- a second request attempt fails there, not silently.
// Approval (createContactUnlockInvoice) attaches an invoice_id to this
// same row rather than inserting a new one.

export async function getContactUnlockStatus(
  applicationId: string,
  companyId:     string,
): Promise<ContactUnlockStatus> {
  const { data, error } = await supabase
    .from('contact_unlocks')
    .select('status')
    .eq('application_id', applicationId)
    .eq('company_id', companyId)
    .maybeSingle();

  if (error || !data) return 'none';
  return data.status === 'paid' ? 'paid' : 'pending'; // 'revoked' also reads as re-requestable ('none'-like); treated as 'pending' here since revocation isn't built yet -- no code path sets it
}

export async function getContactUnlockStatusesForApplications(
  applicationIds: string[],
  companyId:      string,
): Promise<Map<string, ContactUnlockStatus>> {
  if (applicationIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('contact_unlocks')
    .select('application_id, status')
    .in('application_id', applicationIds)
    .eq('company_id', companyId);

  if (error || !data) return new Map();
  return new Map(data.map((r) => [r.application_id as string, (r.status === 'paid' ? 'paid' : 'pending') as ContactUnlockStatus]));
}

// Only ever called for applicationIds already confirmed 'paid' by the
// caller -- this function itself re-derives that from contact_unlocks
// rather than trusting the caller, so a future call site can't
// accidentally leak contact info by skipping the status check.
export async function getUnlockedContactInfo(
  applicationIds: string[],
  companyId:      string,
): Promise<Map<string, { phone: string; email: string | null }>> {
  if (applicationIds.length === 0) return new Map();

  const { data: unlocks, error: unlockError } = await supabase
    .from('contact_unlocks')
    .select('application_id')
    .in('application_id', applicationIds)
    .eq('company_id', companyId)
    .eq('status', 'paid');
  if (unlockError || !unlocks || unlocks.length === 0) return new Map();

  const paidApplicationIds = unlocks.map((r) => r.application_id as string);
  const { data: rows, error } = await supabase
    .from('applications')
    .select('id, candidates ( phone, email )')
    .in('id', paidApplicationIds);
  if (error || !rows) return new Map();

  const result = new Map<string, { phone: string; email: string | null }>();
  for (const row of rows) {
    const candidate = row.candidates as unknown as { phone: string; email: string | null } | { phone: string; email: string | null }[] | null;
    const info = Array.isArray(candidate) ? candidate[0] : candidate;
    if (info) result.set(row.id as string, { phone: info.phone, email: info.email ?? null });
  }
  return result;
}

// Called by the company-portal request route, right after it validates
// ownership/consent/status==='none'. Failure here (almost always the
// unique index, a race between two near-simultaneous requests) should
// surface to that caller as "already requested," not a generic 500.
export async function createContactUnlockRequest(
  applicationId: string,
  companyId:     string,
): Promise<void> {
  const id = `cu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from('contact_unlocks').insert({
    id,
    application_id: applicationId,
    company_id:     companyId,
    status:         'pending',
  });
  if (error) throw new Error(`Failed to create contact unlock request: ${error.message}`);
}

// Called by the staff approve route. Attaches an invoice to the pending
// row createContactUnlockRequest() already made -- see this file's own
// top comment for why the row isn't created here instead.
export async function createContactUnlockInvoice(data: {
  applicationId: string;
  companyId:     string;
  companyName:   string;
  candidateName: string;
  jobTitle:      string;
  priceMmk:      number;
}): Promise<Invoice> {
  const { count, error: countError } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Failed to compute invoice number: ${countError.message}`);

  const sequence      = (count ?? 0) + 1;
  const invoiceNumber = `INV-${String(sequence).padStart(5, '0')}`;
  const invoiceId     = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const { error: invoiceError } = await supabase.from('invoices').insert({
    id:                  invoiceId,
    invoice_number:      invoiceNumber,
    company_id:          data.companyId,
    company_name:        data.companyName,
    application_id:      null,
    candidate_name:      '—',
    position:            `Direct Contact Unlock — ${data.candidateName} (${data.jobTitle})`,
    agreed_salary:       data.priceMmk,
    commission_rate_pct: 100,
    commission_fee_mmk:  data.priceMmk,
    status:              'Draft',
    charge_type:         'contact_unlock',
    metadata:            { applicationId: data.applicationId } satisfies ContactUnlockInvoiceMetadata,
  });
  if (invoiceError) throw new Error(`Failed to create contact unlock invoice: ${invoiceError.message}`);

  const { data: updatedRows, error: unlockError } = await supabase
    .from('contact_unlocks')
    .update({ invoice_id: invoiceId })
    .eq('application_id', data.applicationId)
    .eq('company_id', data.companyId)
    .select('id');
  if (unlockError) {
    // The invoice above is already committed at this point; leave it (a
    // staff member can void/dismiss it manually) rather than attempt a
    // rollback this client can't do atomically anyway.
    throw new Error(`Failed to attach invoice to contact unlock request: ${unlockError.message}`);
  }
  if (!updatedRows || updatedRows.length === 0) {
    // No pending row found -- the request row is missing entirely (a
    // stale/manually-crafted approve call), not the expected path.
    throw new Error('No pending contact unlock request found for this application/company.');
  }

  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error('Invoice created but could not be re-fetched.');
  return invoice;
}

// Single choke point the payments route calls, same pattern as
// activateFeaturedPlacementIfInvoicePaid/activateJobBoostIfInvoicePaid.
export async function activateContactUnlockIfInvoicePaid(invoice: Invoice): Promise<void> {
  if (invoice.chargeType !== 'contact_unlock') return;
  const { error } = await supabase
    .from('contact_unlocks')
    .update({ status: 'paid', unlocked_at: new Date().toISOString() })
    .eq('invoice_id', invoice.id);
  if (error) throw new Error(`Failed to activate contact unlock: ${error.message}`);
}
