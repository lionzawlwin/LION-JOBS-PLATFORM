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

---

# Phase 4: Per-Tab/Per-Action RBAC — Progress

Spec: `docs/superpowers/specs/2026-07-03-phase-4-rbac-design.md`
Plan: `docs/superpowers/plans/2026-07-03-phase-4-rbac.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)
Branch: `feat/phase-4-rbac` (not yet merged — PR opened for human review)

| Task | Description | Status |
|------|--------------|--------|
| 1 | Permissions matrix (`src/lib/permissions.ts`) | ✅ Done |
| 2 | `requireTabAccess()` guard (`src/lib/auth.ts`) | ✅ Done |
| 3 | Gate candidates domain routes | ✅ Done |
| 4 | Gate billing domain routes | ✅ Done |
| 5 | Gate companies domain routes | ✅ Done |
| 6 | Gate enterprise domain routes | ✅ Done |
| 7 | Gate b2b-leads domain routes | ✅ Done |
| 8 | Gate content + campaigns domain routes | ✅ Done |
| 9 | Gate legal domain routes | ✅ Done |
| 10 | Layer `requireTabAccess` onto ADMIN_KEY-gated job routes | ✅ Done |
| 11 | Client-side tab filtering in `DashboardClient.tsx` | ✅ Done |
| 12 | Final verification | ✅ Done |

## Log

- 2026-07-03: Built a hard-coded (role, dashboard-tab) → access-level matrix (`none`/`view`/`manage`) covering all 4 roles (`owner`, `admin`, `cse`, `viewer`) × 12 tabs, per the design spec. `owner`/`admin` behavior is unchanged (full access everywhere). `cse` gets full access to the enterprise/B2B CRM domain (Companies, Enterprise, B2B Leads) plus view-only on Legal/Billing/Overview, and no access to recruitment or marketing tabs. `viewer` gets read-only access everywhere except Post Job and Team.
- 2026-07-03: Migrated ~31 API route files from the single-tier `requireStaff()` check to the new per-domain `requireTabAccess(domain, level)` check, one domain per task, each independently spec- and code-quality-reviewed.
- 2026-07-03: **Two pre-existing, unrelated auth gaps were found and fixed as a natural consequence of this work**, not scope creep — both routes were being touched anyway to add the domain gate, and neither had any auth check at all before this branch: `GET /api/candidates` (full candidate PII — name, phone, email, CV links — was fetchable by anyone unauthenticated) and `POST /api/content/distribute` (currently a 501 stub, but was wide open regardless).
- 2026-07-03: Fixing the `GET /api/candidates` gap surfaced a real regression: `cse`-role staff have `overview: 'view'` (so the Overview tab, the dashboard's default, stays visible to them) but `candidates: 'none'`, and `AnalyticsOverview.tsx` unconditionally calls `useCandidates()` to build KPI stats. Before this fix, a 401 from the newly-added guard would have resolved to `{error: 'Unauthorized'}` as SWR `data` (since `useCandidates.ts`'s fetcher never checked `response.ok`), and `AnalyticsOverview` would crash calling `.filter()` on that object. Fixed by making the fetcher `r.ok`-aware (matching the existing pattern already used in `LegalView.tsx`), so a non-ok response now correctly becomes an SWR `error` and `candidates` degrades to `[]` instead of crashing.
- 2026-07-03: `/api/jobs` (`POST`) and `/api/jobs/[id]` (`DELETE`) were found to be gated ONLY by a legacy, session-independent `ADMIN_KEY` header — not by `requireStaff()` at all. Per the design spec, `requireTabAccess()` was layered on as an *additional* required check ahead of the existing `ADMIN_KEY` check (both must now pass); the `ADMIN_KEY` mechanism itself was left completely untouched, not redesigned.
- 2026-07-03: Final verification caught a route the original 12-task plan's route inventory had missed entirely: `src/app/api/download/route.ts` (a Google Drive CV-download proxy, used only from `CandidateDrawer.tsx`, no other caller). Gated it under `candidates`/`view` in a supplementary reviewed fix before this final task could pass.
- 2026-07-03: Explicitly NOT gated, by design: `GET /api/legal/settings` (public, used by the unauthenticated candidate-facing consent modal), `GET /api/jobs` (public job board), `POST /api/candidates/[id]/consent` (public, identity-verified via email/phone match instead), and `/api/staff/*` (already `requireRole(['owner','admin'])` from Phase 3, left exactly as-is).
- 2026-07-03: Out of scope, deferred: row-level data scoping for `cse` (would need a `Staff`↔`CseRep` link that doesn't exist yet), a DB-backed configurable permissions UI, per-individual-action granularity, and Sentry/Observability (separately agreed as Phase 5).
- 2026-07-03: Could not exercise live in a browser — the dashboard is gated behind Google OAuth as a live human account, which this session can't drive. Recommend the admin spot-check a `cse` login and a `viewer` login post-merge: confirm hidden tabs stay hidden, confirm a direct API call to a `manage`-gated route as a `cse` session returns 401, confirm the Overview tab no longer crashes for `cse`.
