import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getJobById, getApplicantsForJob } from '@/lib/db';
import type { NextRequest } from 'next/server';

// GET /api/company-portal/jobs/[jobId]/applicants
// Employer Applicant Visibility (repo owner's explicit decision: name +
// resume/CV only, no contact info -- the agency stays the required
// intermediary for actually reaching a candidate). Ownership check here
// is the real enforcement boundary: getApplicantsForJob() trusts jobId,
// so a company requesting a jobId it doesn't own must be rejected before
// that call, not after.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const { jobId } = await context.params;

  const job = await getJobById(jobId);
  if (!job || job.companyId !== companyId) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  const applicants = await getApplicantsForJob(jobId);
  return NextResponse.json(applicants, { headers: { 'Cache-Control': 'no-store' } });
}
