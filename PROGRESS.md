# B2B Billing & Invoicing — Progress

Plan: `docs/superpowers/plans/2026-07-02-billing-invoicing-subsystem.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)

| Task | Description | Status | Commit(s) |
|------|--------------|--------|-----------|
| 1 | Database migration (`invoices` table, `final_agreed_salary` column) | ✅ Done | b3df371 |
| 2 | Types (`Invoice`, `InvoiceStatus`, `Candidate.finalAgreedSalary`) | ✅ Done | 0af54c2 |
| 3 | `invoices` data access + `candidates.ts` extension | ✅ Done | 099b97b |
| 4 | Final-salary API route | ✅ Done | 642962f |
| 5 | Invoice API routes | ✅ Done | d668103, 7bf25b1 |
| 6 | i18n keys for Billing | ✅ Done | 27cadc4 |
| 7 | `BillingView.tsx` component | ✅ Done | 3aa10c4, 310dac0 |
| 8 | Add "Billing" tab to `DashboardClient.tsx` | ✅ Done | 98f67e6 |
| 9 | Candidate Drawer — final salary + invoice generation | ✅ Done | f0b3de4, 0ec52c3 |
| 10 | Invoice print route | ✅ Done | e3c6994 |
| 11 | Final verification pass | ✅ Done | 1a92bfb, (this fix) |

## Log
- 2026-07-02: Resumed work at Task 5. Tasks 1-4 were already committed on `worktree-b2b-enterprise-crm` prior to this session.
- 2026-07-02: Task 5 implemented (d668103), spec-reviewed (compliant), code-quality-reviewed (approved with 2 follow-ups). Fixed both follow-ups (7bf25b1): added `Cache-Control: no-store` to invoice GET routes, added status-filter validation on `GET /api/invoices`. **Deferred, not fixed:** check-then-act race on duplicate invoice creation for the same `applicationId` (no DB `UNIQUE` constraint on `invoices.application_id`) — fixing requires a migration change + manual SQL re-run by a human against Supabase; low risk for a single-admin internal tool, logged here as an accepted follow-up rather than blocking the plan.
- 2026-07-02: Task 6 implemented (27cadc4) — 9 new `en`/`my` i18n keys for the Billing tab and Candidate Drawer billing section. Spec review: compliant. Code quality review: approved, no issues.
- 2026-07-02: Task 7 implemented (3aa10c4) — `BillingView.tsx`, following `LegalView.tsx`'s pattern. Spec review: compliant. Code quality review: approved with 1 Important follow-up (silent "No invoices yet" state on a failed load, misleading on a billing screen). Fixed (310dac0): added an `error` state + distinct error UI with Retry button. Left 2 minor/nit items (missing aria-labels on filter selects, un-memoized derived values) untouched — both mirror pre-existing gaps in `LegalView.tsx`, not regressions.
- 2026-07-02: Task 8 implemented (98f67e6) — wired the Billing tab into `DashboardClient.tsx` (6 additive insertions matching the `legal` tab's pattern). Spec review: compliant. Code quality review: approved, zero issues.
- 2026-07-02: Task 9 implemented (f0b3de4) — final agreed salary + invoice generation UI in `CandidateDrawer.tsx`, gated to Hired stage. Spec review: compliant. Code quality review: found 1 real Important bug (`mutateInvoice()` could revalidate the wrong candidate's SWR key if the admin switched candidates while a Generate Invoice POST was in flight, per a traced SWR internals bug). Fixed (0ec52c3): pinned candidate id before the async call and revalidate an explicit key via `globalMutate`. Left 4 Minor items untouched (error-handling asymmetry between save handlers, auto-match effect not respecting an explicit "clear to no company", 840-line file size, falsy-zero salary edge case) — logged as accepted follow-ups, several match pre-existing codebase patterns.
- 2026-07-02: Task 10 implemented (e3c6994) — `InvoiceDocument.tsx` + admin-gated print route at `/dashboard/billing/invoice/[invoiceId]/print`, reusing `AutoPrint.tsx` unchanged. This closes the loop on Print/View Invoice links from Tasks 7 and 9. Spec review: compliant. Code quality review: approved, zero issues (auth pattern, info-leak ordering, print CSS, XSS surface, and directory placement all explicitly checked and cleared).
- 2026-07-02: Task 11 (final verification) — code-quality review of the full billing subsystem surfaced a real staleness bug in `CandidateDrawer.tsx` (fixed in 1a92bfb): `candidate.finalAgreedSalary` is a snapshot prop that `globalMutate('/api/candidates')` doesn't replace in place, so right after the first successful final-salary save the invoice section stayed stuck on the disabled placeholder in the same sitting. That fix added an `effectiveFinalAgreedSalary`/`effectiveSalary` fallback to the local `finalSalaryVal` input state — but the fallback wasn't gated on `finalSalaryEditMode`, so it recomputed on every keystroke while the admin was still typing an unsaved salary, making "Generate Invoice" render/react before Save was ever clicked. **CRITICAL bug**, fixed in this pass: gated both fallbacks on `finalSalaryEditMode` (mirroring the existing `effectiveCvUrl`/`effectiveInterviewLocation` pattern in the same file) so the local value only substitutes in once edit mode has closed (i.e. right after a successful save), not while there's an unsaved keystroke in flight. Verified via `npx tsc --noEmit` (clean) and manual trace against the `effectiveCvUrl` pattern; **could not exercise live in a browser** — the dashboard is gated behind Google OAuth as the single admin account, which this session can't drive. Recommend the admin click through Hired → set final salary → generate invoice once before merging, to confirm the UI no longer flickers reactive to typing.
