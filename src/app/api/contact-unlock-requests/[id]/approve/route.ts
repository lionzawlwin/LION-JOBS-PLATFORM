import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { createContactUnlockInvoice, resolveSystemEvent, getAgencySettings } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// POST /api/contact-unlock-requests/[id]/approve
// Body: { applicationId: string, companyId: string, companyName: string, candidateName: string, jobTitle: string }
// Creates a Draft invoice + a pending contact_unlocks row for the flat
// unlock price and clears the request from the inbox. Deliberately does
// NOT reveal phone/email here -- same "approval creates the bill,
// payment triggers the benefit" separation as Featured Placement/Job
// Boost's approve routes.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { applicationId, companyId, companyName, candidateName, jobTitle } = body as Record<string, unknown>;
  if (
    typeof applicationId !== 'string' || typeof companyId !== 'string' ||
    typeof companyName !== 'string' || typeof candidateName !== 'string' || typeof jobTitle !== 'string'
  ) {
    return Response.json({ error: 'applicationId, companyId, companyName, candidateName, and jobTitle are required.' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const resolvedBy = session?.user?.email;
  if (!resolvedBy) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await getAgencySettings();
    const invoice = await createContactUnlockInvoice({
      applicationId,
      companyId,
      companyName,
      candidateName,
      jobTitle,
      priceMmk: settings.contactUnlockPriceMmk,
    });

    await resolveSystemEvent(id, resolvedBy);
    await logAudit({ action: 'update', domain: 'billing', entityType: 'contact_unlock_request', entityId: id });

    return Response.json({ ok: true, invoice });
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/contact-unlock-requests/[id]/approve',
      message:  'Could not approve contact unlock request',
      error:    err,
      context:  { requestId: id, companyId, applicationId },
    });
    return Response.json({ error: 'Could not approve this request.' }, { status: 502 });
  }
}
