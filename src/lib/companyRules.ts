import type { Company } from '@/types';

// Layer 10: internal companies (the repo owner's own F&B brands) have no
// commercial relationship with the agency -- there's nothing to invoice.
// Single source of truth, used both by POST /api/invoices (the real
// enforcement boundary) and CandidateDrawer.tsx's company picker (so the
// option never appears in the normal flow). Deliberately has zero
// Supabase/server-only imports -- see this file's test/plan for why it
// can't live in src/lib/db/companies.ts.
export function isInvoiceableCompany(company: Company): boolean {
  return !company.isInternal;
}

// Self-Serve Featured Placement Upsell. Price and duration are owner-
// editable data now (agency_settings.featured_placement_price_mmk/
// _duration_days, via the Billing tab's FeaturedPlacementSettingsPanel) --
// this file only carries the invoice-tagging convention, not the values
// themselves, so it has no stale copy of a number that can drift from the
// DB. Deliberately has zero Supabase/server-only imports (see
// isInvoiceableCompany's comment) -- callers fetch the live settings via
// getAgencySettings() and pass the duration in here.

// The human-readable line-item text this flow tags its invoices with
// (Invoice.position). The actual activation duration is read from
// Invoice.metadata (migration 0033), captured at invoice-creation time --
// not looked up again later -- so a price/duration change in Settings
// never retroactively changes what an already-issued invoice activates for.
const FEATURED_PLACEMENT_POSITION_PREFIX = 'Featured Placement — ';

export function featuredPlacementInvoicePosition(durationDays: number): string {
  return `${FEATURED_PLACEMENT_POSITION_PREFIX}${durationDays} days`;
}

// Employer Applicant Visibility's real enforcement boundary, extracted as
// a pure function so it's directly unit-testable rather than only ever
// checked inline in GET /api/company-portal/jobs/[jobId]/applicants --
// same reasoning as permissions.ts's isLockedOutByChange(). A job with no
// companyId (never matched to a CRM company at creation) can never be
// viewed by any company -- `null !== companyId` is always true for a
// non-empty companyId, which is the correct fail-closed behavior.
export function canViewJobApplicants(job: { companyId?: string | null } | null, requestingCompanyId: string): boolean {
  return job !== null && job.companyId === requestingCompanyId;
}
