import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { createFeaturedPlacementInvoice, resolveSystemEvent, getAgencySettings } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// POST /api/featured-placement-requests/[id]/approve
// Body: { companyId: string, companyName: string }
// Creates a Draft invoice for the flat featured-placement price and clears
// the request from the inbox. Deliberately does NOT set companies.is_featured
// here -- per the mandate, that only happens once the invoice is actually
// marked Paid (see POST /api/invoices/[id]/payments and the PATCH status
// route), same "approval creates the bill, payment triggers the benefit"
// separation as a real subscription checkout.
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

  const { companyId, companyName } = body as Record<string, unknown>;
  if (typeof companyId !== 'string' || typeof companyName !== 'string') {
    return Response.json({ error: 'companyId and companyName are required.' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const resolvedBy = session?.user?.email;
  if (!resolvedBy) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await getAgencySettings();
    const invoice = await createFeaturedPlacementInvoice({
      companyId,
      companyName,
      priceMmk:     settings.featuredPlacementPriceMmk,
      durationDays: settings.featuredPlacementDurationDays,
    });

    await resolveSystemEvent(id, resolvedBy);
    await logAudit({ action: 'update', domain: 'billing', entityType: 'featured_placement_request', entityId: id });

    return Response.json({ ok: true, invoice });
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/featured-placement-requests/[id]/approve',
      message:  'Could not approve featured placement request',
      error:    err,
      context:  { requestId: id, companyId },
    });
    return Response.json({ error: 'Could not approve this request.' }, { status: 502 });
  }
}
