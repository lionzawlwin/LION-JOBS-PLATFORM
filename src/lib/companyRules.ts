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
