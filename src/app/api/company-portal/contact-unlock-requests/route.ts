import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCompanyById, getJobById, getApplicantsForJob, getAgencySettings, appendSystemEvent, createContactUnlockRequest } from '@/lib/db';

// Self-Serve Direct-Contact-Info Unlock (employer side). Re-fetches
// getApplicantsForJob() (the same call the Company Portal UI already made
// to show the Unlock button in the first place) rather than duplicating
// its ownership/consent/status logic here -- one source of truth for
// "can this company unlock this applicant right now."
export async function POST(req: Request) {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { jobId, applicationId } = (body as Record<string, unknown> | null) ?? {};
  if (typeof jobId !== 'string' || !jobId || typeof applicationId !== 'string' || !applicationId) {
    return NextResponse.json({ error: 'jobId and applicationId are required.' }, { status: 422 });
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  }

  const job = await getJobById(jobId);
  // Ownership check, same as job-boost-request: a company can only
  // request an unlock for an applicant on its own job posting.
  if (!job || job.companyId !== companyId) {
    return NextResponse.json({ error: 'Job not found.' }, { status: 404 });
  }

  const applicants = await getApplicantsForJob(jobId, companyId);
  const applicant = applicants.find((a) => a.id === applicationId);
  if (!applicant) {
    return NextResponse.json({ error: 'Applicant not found.' }, { status: 404 });
  }

  if (!applicant.directContactConsent) {
    return NextResponse.json({ error: "This candidate hasn't enabled direct contact unlock." }, { status: 422 });
  }
  if (applicant.contactUnlockStatus !== 'none') {
    return NextResponse.json({ error: 'This applicant has already been requested or unlocked.' }, { status: 409 });
  }

  try {
    await createContactUnlockRequest(applicationId, companyId);
  } catch {
    // Overwhelmingly the unique (application_id, company_id) index -- a
    // near-simultaneous duplicate request slipped past the status check
    // above. Report it the same way as an already-known duplicate.
    return NextResponse.json({ error: 'This applicant has already been requested or unlocked.' }, { status: 409 });
  }

  const settings = await getAgencySettings();

  await appendSystemEvent({
    category: 'contact_unlock',
    level:    'info',
    route:    '/api/company-portal/contact-unlock-requests',
    message:  `${company.name} requested direct contact for ${applicant.name} (${job.title})`,
    context: {
      companyId,
      companyName:   company.name,
      applicationId,
      candidateName: applicant.name,
      jobId,
      jobTitle:      job.title,
      priceMmk:      settings.contactUnlockPriceMmk,
    },
  });

  return NextResponse.json({ ok: true });
}
