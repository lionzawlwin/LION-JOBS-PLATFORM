import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInvoices, getInvoiceByApplicationId, createInvoice, getCompanyById, getAgencySettings } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get('companyId') ?? undefined;
  const status    = req.nextUrl.searchParams.get('status') ?? undefined;
  const invoices  = await getInvoices({ companyId, status });
  return Response.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
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
    return Response.json(invoice, { status: 201 });
  } catch (err) {
    console.error('[invoices/post]', err);
    return Response.json({ error: 'Could not create invoice.' }, { status: 502 });
  }
}
