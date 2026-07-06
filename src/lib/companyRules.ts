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

// Self-Serve Featured Placement Upsell. Flat price/duration, not a
// per-company-negotiated rate -- deliberately simple like Layer 13's
// account plan prices, and just as owner-editable in principle (there's
// just no admin UI for it yet since there's only one price point, unlike
// the 3-tier account plans). Treat this initial price as a placeholder
// the repo owner should confirm/adjust; it was not given by the owner the
// way the Bronze/Silver/Gold prices were in an earlier session.
export const FEATURED_PLACEMENT_PRICE_MMK = 50_000;
export const FEATURED_PLACEMENT_DURATION_DAYS = 30;

// The marker this flow tags its invoices with (Invoice.position), the
// same "encode the type in a descriptive text field" trick
// createPlanUpgradeInvoice() uses -- avoids a schema change to invoices
// for a second non-candidate-placement charge type. Whatever reads an
// invoice back to decide "is this a featured-placement charge" (the
// paid-invoice webhook-equivalent in the payments route) must use
// isFeaturedPlacementInvoicePosition(), not a fresh string comparison.
const FEATURED_PLACEMENT_POSITION_PREFIX = 'Featured Placement — ';

export function featuredPlacementInvoicePosition(): string {
  return `${FEATURED_PLACEMENT_POSITION_PREFIX}${FEATURED_PLACEMENT_DURATION_DAYS} days`;
}

export function isFeaturedPlacementInvoicePosition(position: string): boolean {
  return position.startsWith(FEATURED_PLACEMENT_POSITION_PREFIX);
}
