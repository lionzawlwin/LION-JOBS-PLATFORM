import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getJobById, getApplicantsForJob, getAgencySettings } from '@/lib/db';
import { canViewJobApplicants } from '@/lib/companyRules';
import type { NextRequest } from 'next/server';

// GET /api/company-portal/jobs/[jobId]/applicants
// Employer Applicant Visibility (repo owner's explicit decision: name +
// resume/CV only, no contact info -- the agency stays the required
// intermediary for actually reaching a candidate). canViewJobApplicants()
// is the real enforcement boundary: getApplicantsForJob() trusts jobId,
// so a company requesting a jobId it doesn't own must be rejected before
// that call, not after. See companyRules.test.ts for the direct unit
// coverage on that check.
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
  if (!canViewJobApplicants(job, companyId)) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  const [applicants, settings] = await Promise.all([
    getApplicantsForJob(jobId, companyId),
    getAgencySettings(),
  ]);
  return NextResponse.json(
    { applicants, contactUnlockPriceMmk: settings.contactUnlockPriceMmk },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
