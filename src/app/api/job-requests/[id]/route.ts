import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { approveJobRequest, rejectJobRequest, getJobRequestById, getCompanyById } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';
import { sendJobRequestDecisionEmail } from '@/lib/portalEmail';
import { buildJobSlug } from '@/lib/utils';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), rejectionNote: z.string().trim().min(1).max(2000) }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('manage-jobs', 'manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const rawBody = await req.json().catch(() => null);
  if (!rawBody) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 422 });
  }

  const request = await getJobRequestById(id);
  if (!request) {
    return NextResponse.json({ error: 'Job request not found.' }, { status: 404 });
  }
  const company = await getCompanyById(request.companyId);

  const session = await getServerSession(authOptions);
  const reviewedBy = session?.user?.email;
  if (!reviewedBy) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

  try {
    if (parsed.data.action === 'approve') {
      const jobId = await approveJobRequest(id, reviewedBy);
      await logAudit({ action: 'update', domain: 'manage-jobs', entityType: 'job_request', entityId: id });
      await logAudit({ action: 'create', domain: 'manage-jobs', entityType: 'job', entityId: jobId });

      if (company?.email) {
        try {
          const jobUrl = `${SITE_URL}/jobs/${buildJobSlug({ id: jobId, title: request.title })}`;
          await sendJobRequestDecisionEmail({
            to: company.email, companyName: company.name, title: request.title,
            decision: 'approved', jobUrl,
          });
        } catch (err) {
          await logFailure({ category: 'other', route: '/api/job-requests/[id]', message: 'Failed to send approval email', error: err, context: { jobRequestId: id } });
        }
      }

      return NextResponse.json({ ok: true, jobId });
    }

    await rejectJobRequest(id, reviewedBy, parsed.data.rejectionNote);
    await logAudit({ action: 'update', domain: 'manage-jobs', entityType: 'job_request', entityId: id });

    if (company?.email) {
      try {
        await sendJobRequestDecisionEmail({
          to: company.email, companyName: company.name, title: request.title,
          decision: 'rejected', rejectionNote: parsed.data.rejectionNote,
        });
      } catch (err) {
        await logFailure({ category: 'other', route: '/api/job-requests/[id]', message: 'Failed to send rejection email', error: err, context: { jobRequestId: id } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (parsed.data.action === 'approve') {
      const postFailureState = await getJobRequestById(id).catch(() => null);
      await logFailure({
        category: 'other',
        route: '/api/job-requests/[id]',
        message: 'Failed to process job request decision',
        error: err,
        context: { jobRequestId: id, statusAfterFailure: postFailureState?.status ?? 'unknown' },
      });

      // Regardless of whether the request row itself was updated before the failure,
      // we cannot reliably tell whether appendJob() already ran — warn the operator either way.
      return NextResponse.json(
        { error: 'Failed to process the approval. If you retry, check Manage Jobs for a possible duplicate posting before resubmitting — a job may have already been created.' },
        { status: 502 },
      );
    }

    await logFailure({ category: 'other', route: '/api/job-requests/[id]', message: 'Failed to process job request decision', error: err, context: { jobRequestId: id } });
    return NextResponse.json({ error: 'Failed to process job request.' }, { status: 502 });
  }
}
