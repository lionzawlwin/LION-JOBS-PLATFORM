import { requireTabAccess } from '@/lib/auth';
import { getInvoiceById, updateInvoiceStatus, activateFeaturedPlacementIfInvoicePaid, activateJobBoostIfInvoicePaid, activateContactUnlockIfInvoicePaid } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';
import type { InvoiceStatus } from '@/types';

const VALID_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceById(id);
  if (!invoice) return Response.json({ error: 'Invoice not found.' }, { status: 404 });
  return Response.json(invoice, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as InvoiceStatus)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 422 });
  }

  try {
    const invoice = await getInvoiceById(id);
    await updateInvoiceStatus(id, body.status as InvoiceStatus);
    await logAudit({ action: 'update', domain: 'billing', entityType: 'invoice', entityId: id });

    // Defense-in-depth: the UI's own status stepper only ever reaches Paid
    // via POST /api/invoices/[id]/payments (see BillingView.tsx's
    // INVOICE_STEPS comment), which already does this. This covers the
    // route's own manual-dropdown capability, in case anything else calls
    // it directly. Best-effort, same reasoning as the payments route.
    if (body.status === 'Paid' && invoice) {
      try {
        await activateFeaturedPlacementIfInvoicePaid(invoice);
      } catch (activationErr) {
        await logFailure({
          category: 'invoicing',
          route:    '/api/invoices/[id]',
          message:  'Invoice marked Paid but featured placement activation failed',
          error:    activationErr,
          context:  { invoiceId: id, companyId: invoice.companyId },
        });
      }
      try {
        await activateJobBoostIfInvoicePaid(invoice);
      } catch (activationErr) {
        await logFailure({
          category: 'invoicing',
          route:    '/api/invoices/[id]',
          message:  'Invoice marked Paid but job boost activation failed',
          error:    activationErr,
          context:  { invoiceId: id, companyId: invoice.companyId },
        });
      }
      try {
        await activateContactUnlockIfInvoicePaid(invoice);
      } catch (activationErr) {
        await logFailure({
          category: 'invoicing',
          route:    '/api/invoices/[id]',
          message:  'Invoice marked Paid but contact unlock activation failed',
          error:    activationErr,
          context:  { invoiceId: id, companyId: invoice.companyId },
        });
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/invoices/[id]',
      message:  'Could not update invoice status',
      error:    err,
      context:  { invoiceId: id },
    });
    return Response.json({ error: 'Could not update invoice status.' }, { status: 502 });
  }
}
