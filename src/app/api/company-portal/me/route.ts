import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCompanyById, getJobs, getCandidates, getInvoices } from '@/lib/db';
import type { ApplicationStatus } from '@/types';

const STAGES: ApplicationStatus[] = ['Applied', 'Shortlisted', 'Interview', 'Hired'];

export async function GET() {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  }

  // Jobs are matched by company name, not a real company_id FK -- jobs.company
  // has always been a free-text string in this schema (confirmed: no jobs.company_id
  // column exists anywhere). Exact-string match, same as the public
  // companies/[slug] profile page already relies on. A real company_id FK on
  // jobs would be the correct fix, but is a bigger schema change deliberately
  // out of scope for this foundation pass -- flagged, not silently worked
  // around.
  const [allJobs, allCandidates, invoices] = await Promise.all([
    getJobs(),
    getCandidates(),
    getInvoices({ companyId }),
  ]);

  const companyJobs = allJobs.filter((j) => j.company === company.name);
  const companyJobIds = new Set(companyJobs.map((j) => j.id));

  // Aggregate applicant counts only -- never expose individual candidate
  // names, phone numbers, or emails to the company portal in this
  // foundation pass. Deciding what candidate detail is appropriate to share
  // with an employer is a real product/business decision (this is a
  // staffing agency's placement business, not a self-serve job board),
  // not something to default into unilaterally on a brand-new external
  // auth surface.
  const applicantCountsByJob = new Map<string, Record<ApplicationStatus, number>>();
  for (const jobId of companyJobIds) {
    applicantCountsByJob.set(jobId, { Applied: 0, Shortlisted: 0, Interview: 0, Hired: 0 });
  }
  for (const candidate of allCandidates) {
    if (!candidate.jobId || !companyJobIds.has(candidate.jobId)) continue;
    const counts = applicantCountsByJob.get(candidate.jobId);
    if (counts && STAGES.includes(candidate.stage)) counts[candidate.stage]++;
  }

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      city: company.city,
      tier: company.tier,
    },
    jobs: companyJobs.map((j) => ({
      id: j.id,
      title: j.title,
      location: j.location,
      category: j.category,
      type: j.type,
      postedAt: j.postedAt,
      applicantCounts: applicantCountsByJob.get(j.id) ?? { Applied: 0, Shortlisted: 0, Interview: 0, Hired: 0 },
    })),
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      position: inv.position,
      agreedSalary: inv.agreedSalary,
      commissionFeeMmk: inv.commissionFeeMmk,
      status: inv.status,
      issuedAt: inv.issuedAt,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
