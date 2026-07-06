import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { createJobBoostInvoice, resolveSystemEvent, getAgencySettings } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// POST /api/job-boost-requests/[id]/approve
// Body: { companyId: string, companyName: string, jobId: string, jobTitle: string }
// Creates a Draft invoice for the flat job-boost price and clears the
// request from the inbox. Deliberately does NOT set jobs.is_featured here
// -- same "approval creates the bill, payment triggers the benefit"
// separation as the Featured Placement approve route.
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

  const { companyId, companyName, jobId, jobTitle } = body as Record<string, unknown>;
  if (
    typeof companyId !== 'string' || typeof companyName !== 'string' ||
    typeof jobId !== 'string' || typeof jobTitle !== 'string'
  ) {
    return Response.json({ error: 'companyId, companyName, jobId, and jobTitle are required.' }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const resolvedBy = session?.user?.email;
  if (!resolvedBy) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const settings = await getAgencySettings();
    const invoice = await createJobBoostInvoice({
      companyId,
      companyName,
      priceMmk:     settings.jobBoostPriceMmk,
      jobId,
      jobTitle,
      durationDays: settings.jobBoostDurationDays,
    });

    await resolveSystemEvent(id, resolvedBy);
    await logAudit({ action: 'update', domain: 'billing', entityType: 'job_boost_request', entityId: id });

    return Response.json({ ok: true, invoice });
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/job-boost-requests/[id]/approve',
      message:  'Could not approve job boost request',
      error:    err,
      context:  { requestId: id, companyId, jobId },
    });
    return Response.json({ error: 'Could not approve this request.' }, { status: 502 });
  }
}
