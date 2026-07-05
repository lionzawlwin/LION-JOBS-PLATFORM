import { requireTabAccess } from '@/lib/auth';
import { getInvoices, getInvoiceByApplicationId, createInvoice, getCompanyById, getAgencySettings } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { sendInvoiceIssuedEmail } from '@/lib/portalEmail';
import { isInvoiceableCompany } from '@/lib/companyRules';
import type { NextRequest } from 'next/server';
import type { InvoiceStatus } from '@/types';

const VALID_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('billing', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get('companyId') ?? undefined;
  const status    = req.nextUrl.searchParams.get('status') ?? undefined;

  if (status && !VALID_STATUSES.includes(status as InvoiceStatus)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 422 });
  }

  const invoices  = await getInvoices({ companyId, status });
  return Response.json(invoices, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    applicationId?: string;
    candidateName?: string;
    position?:      string;
    companyId?:     string;
    agreedSalary?:  number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { applicationId, candidateName, position, companyId, agreedSalary } = body;
  if (
    !applicationId || !candidateName || !position || !companyId ||
    typeof agreedSalary !== 'number' || !Number.isFinite(agreedSalary) || agreedSalary <= 0
  ) {
    return Response.json(
      { error: 'applicationId, candidateName, position, companyId, and a positive agreedSalary are required.' },
      { status: 422 },
    );
  }

  const existing = await getInvoiceByApplicationId(applicationId);
  if (existing) {
    return Response.json(
      { error: 'An invoice already exists for this application.', invoiceId: existing.id },
      { status: 409 },
    );
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    return Response.json({ error: 'Company not found.' }, { status: 404 });
  }
  if (!isInvoiceableCompany(company)) {
    return Response.json({ error: 'Cannot create an invoice for an internal company.' }, { status: 422 });
  }

  const settings = await getAgencySettings();
  const commissionRatePct = company.commissionRatePct ?? settings.defaultCommissionRatePct;

  try {
    const invoice = await createInvoice({
      companyId,
      companyName: company.name,
      applicationId,
      candidateName,
      position,
      agreedSalary,
      commissionRatePct,
    });

    // Best-effort notification -- a failed send must never fail the
    // invoice creation itself (same posture as every other optional
    // integration in this repo; see CLAUDE.md).
    if (company.email) {
      try {
        await sendInvoiceIssuedEmail({
          to: company.email,
          companyName: company.name,
          invoiceNumber: invoice.invoiceNumber,
          position: invoice.position,
          commissionFeeMmk: invoice.commissionFeeMmk,
        });
      } catch (err) {
        await logFailure({
          category: 'invoicing',
          route:    '/api/invoices',
          message:  'Invoice created but notification email failed to send',
          error:    err,
          context:  { invoiceId: invoice.id, companyId },
        });
      }
    }

    return Response.json(invoice, { status: 201 });
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/invoices',
      message:  'Could not create invoice',
      error:    err,
      context:  { applicationId, companyId },
    });
    return Response.json({ error: 'Could not create invoice.' }, { status: 502 });
  }
}
