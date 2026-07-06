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

// The marker this flow tags its invoices with (Invoice.position), the
// same "encode the type in a descriptive text field" trick
// createPlanUpgradeInvoice() uses -- avoids a schema change to invoices
// for a second non-candidate-placement charge type. The duration is
// embedded in the tag itself (not looked up again later) so a price/
// duration change in Settings never retroactively changes what an
// already-issued invoice activates for -- parseFeaturedPlacementDurationDays()
// reads back exactly what was invoiced.
const FEATURED_PLACEMENT_POSITION_PREFIX = 'Featured Placement — ';
const FEATURED_PLACEMENT_POSITION_PATTERN = /^Featured Placement — (\d+) days$/;

export function featuredPlacementInvoicePosition(durationDays: number): string {
  return `${FEATURED_PLACEMENT_POSITION_PREFIX}${durationDays} days`;
}

// Returns the invoiced duration in days if `position` is a featured-
// placement charge, or null otherwise -- doubles as the "is this a
// featured-placement invoice" check (the payments route's paid-invoice
// activation trigger uses this instead of a fresh string comparison).
export function parseFeaturedPlacementDurationDays(position: string): number | null {
  const match = FEATURED_PLACEMENT_POSITION_PATTERN.exec(position);
  return match ? Number(match[1]) : null;
}
