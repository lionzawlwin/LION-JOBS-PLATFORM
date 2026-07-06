import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCompanyById, getJobById, appendSystemEvent, getAgencySettings } from '@/lib/db';

// Self-Serve Featured Job Listing Boost (employer side). Per-job, unlike
// featured-placement-request/route.ts's per-company request -- the caller
// must specify which of their own job postings to boost.
export async function POST(req: Request) {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const jobId = (body as Record<string, unknown> | null)?.jobId;
  if (typeof jobId !== 'string' || !jobId) {
    return NextResponse.json({ error: 'jobId is required.' }, { status: 422 });
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  }

  const job = await getJobById(jobId);
  // Ownership check: a company can only request a boost for its own job
  // posting -- prevents boosting an arbitrary jobId belonging to someone else.
  if (!job || job.companyId !== companyId) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  if (job.isFeatured) {
    return NextResponse.json({ error: 'This job is already featured.' }, { status: 409 });
  }

  const settings = await getAgencySettings();

  await appendSystemEvent({
    category: 'job_boost',
    level:    'info',
    route:    '/api/company-portal/job-boost-request',
    message:  `${company.name} requested a boost for "${job.title}"`,
    context: {
      companyId,
      companyName: company.name,
      jobId,
      jobTitle:    job.title,
      priceMmk:    settings.jobBoostPriceMmk,
      durationDays: settings.jobBoostDurationDays,
    },
  });

  return NextResponse.json({ ok: true });
}
