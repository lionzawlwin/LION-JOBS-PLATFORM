import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInvoiceById, updateInvoiceStatus } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { InvoiceStatus } from '@/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';
const VALID_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceById(id);
  if (!invoice) return Response.json({ error: 'Invoice not found.' }, { status: 404 });
  return Response.json(invoice);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
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
    await updateInvoiceStatus(id, body.status as InvoiceStatus);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[invoices/[id]/patch]', err);
    return Response.json({ error: 'Could not update invoice status.' }, { status: 502 });
  }
}
