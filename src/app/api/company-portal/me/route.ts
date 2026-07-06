import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCompanyById, getJobs, getCandidates, getInvoices, getContracts, getAgencySettings } from '@/lib/db';
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

  // Layer 1 fix (2026-07-05): jobs now carry a real company_id FK,
  // backfilled by exact name match (migration 0016) and auto-populated on
  // every new job going forward (appendJob). Match on company_id first;
  // fall back to the legacy name-string match only for a job that somehow
  // has no company_id (e.g. its company name never matched a CRM row at
  // creation time) so this never regresses visibility for an edge case
  // the backfill didn't cover.
  const [allJobs, allCandidates, invoices, contracts, agencySettings] = await Promise.all([
    getJobs(),
    getCandidates(),
    getInvoices({ companyId }),
    getContracts(companyId),
    getAgencySettings(),
  ]);

  const companyJobs = allJobs.filter((j) => j.companyId === companyId || (!j.companyId && j.company === company.name));
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

  // Layer 14 (Client ROI Dashboard). Aggregate-only, same applicant-detail
  // boundary as above -- no candidate names/contacts, just counts and
  // averages computed from data already fetched for the applicant-count
  // aggregation. avgDaysToFirstApplicantHired is an approximation (days
  // between the job's posted_at and the eventual hire's applied_at, not a
  // true stage-transition-to-Hired timestamp -- that would need
  // stage_updated_at added to getCandidates()'s query, a broader change
  // than this pass's scope) -- labelled as such in the UI, not overclaimed.
  const jobPostedAtById = new Map(companyJobs.map((j) => [j.id, j.postedAt]));
  const companyApplicants = allCandidates.filter((c) => c.jobId && companyJobIds.has(c.jobId));
  const hiredApplicants = companyApplicants.filter((c) => c.stage === 'Hired');
  const scoredApplicants = companyApplicants.filter((c) => c.matchScore > 0);

  const daysToFillSamples = hiredApplicants
    .map((c) => {
      const postedAt = c.jobId ? jobPostedAtById.get(c.jobId) : undefined;
      if (!postedAt) return null;
      const days = Math.floor((new Date(c.appliedAt).getTime() - new Date(postedAt).getTime()) / (1000 * 60 * 60 * 24));
      return days >= 0 ? days : null;
    })
    .filter((d): d is number => d !== null);

  const totalViews = companyJobs.reduce((sum, j) => sum + (j.viewCount ?? 0), 0);

  const insights = {
    totalJobsPosted: companyJobs.length,
    totalViews,
    totalApplicants: companyApplicants.length,
    // Top-of-funnel conversion: what share of viewers actually applied.
    // null (not 0) when there's no view data yet, so the UI can distinguish
    // "0% conversion" from "nothing to compute this from" -- same pattern
    // as fillRate/avgMatchScore below.
    viewToApplyRate: totalViews > 0 ? companyApplicants.length / totalViews : null,
    hiredCount: hiredApplicants.length,
    fillRate: companyJobs.length > 0 ? hiredApplicants.length / companyJobs.length : null,
    avgMatchScore: scoredApplicants.length > 0
      ? Math.round(scoredApplicants.reduce((sum, c) => sum + c.matchScore, 0) / scoredApplicants.length)
      : null,
    avgDaysToFirstApplicantHired: daysToFillSamples.length > 0
      ? Math.round(daysToFillSamples.reduce((sum, d) => sum + d, 0) / daysToFillSamples.length)
      : null,
  };

  return NextResponse.json({
    insights,
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      city: company.city,
      tier: company.tier,
      isFeatured: company.isFeatured,
      featuredUntil: company.featuredUntil,
      featuredPlacementPriceMmk: agencySettings.featuredPlacementPriceMmk,
      featuredPlacementDurationDays: agencySettings.featuredPlacementDurationDays,
    },
    jobs: companyJobs.map((j) => ({
      id: j.id,
      title: j.title,
      location: j.location,
      category: j.category,
      type: j.type,
      postedAt: j.postedAt,
      viewCount: j.viewCount ?? 0,
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
    // Layer 3: read-only document/contract center. Contracts are already
    // scoped by companyId (getContracts), same commercial-transparency
    // reasoning Sprint 2 used for invoices -- an employer seeing the
    // terms of their own agreement is unambiguously appropriate.
    contracts: contracts.map((c) => ({
      id: c.id,
      contractType: c.contractType,
      status: c.status,
      value: c.value,
      currency: c.currency,
      startDate: c.startDate,
      endDate: c.endDate,
    })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
