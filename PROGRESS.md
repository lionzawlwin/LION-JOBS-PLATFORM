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

---

# Phase 5: Sentry + System Health — Progress

Spec: `docs/superpowers/specs/2026-07-03-phase-5-observability-design.md`
Plan: `docs/superpowers/plans/2026-07-03-phase-5-observability.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)
Branch: `feat/phase-5-observability`, pushed to origin. No PR opened yet (`gh` unavailable in this environment) — needs to be created manually at github.com and merged by a human.

| Task | Description | Status |
|------|--------------|--------|
| 1 | Install @sentry/nextjs, store SENTRY_DSN | ✅ Done |
| 2 | system_events migration (0007) | ✅ Done |
| 3 | Types (SystemEvent, FailureCategory, CronStatus) | ✅ Done |
| 4 | system_events DB accessor | ✅ Done |
| 5 | src/instrumentation.ts | ✅ Done |
| 6 | src/lib/observability.ts (logFailure) | ✅ Done |
| 7 | Cron routes (job-alerts, weekly-email) | ✅ Done |
| 8 | Webhook + AI scoring routes | ✅ Done |
| 9 | apply route (3 call sites) | ✅ Done |
| 10 | Invoicing domain | ✅ Done |
| 11 | Candidates "other" routes + stage auth fix | ✅ Done |
| 12 | Remaining "other" routes | ✅ Done |
| 13 | Coverage verification | ✅ Done |
| 14 | system-health permissions domain | ✅ Done |
| 15 | GET /api/system-events | ✅ Done |
| 16 | SystemHealthView.tsx | ✅ Done |
| 17 | Wire tab + i18n | ✅ Done |
| 18 | Final verification | ✅ Done |

## Log

- 2026-07-03: Built Sentry capture (via `src/instrumentation.ts`'s `onRequestError` for truly unhandled exceptions, plus explicit `logFailure()` calls at every already-handled `catch` block) and a local `system_events` Supabase table so the System Health dashboard tab doesn't depend on a live Sentry API call.
- 2026-07-03: Migrated all 21 pre-existing `console.error` call sites plus 2 cron routes and `analyze-cv` (neither had any error logging before) to `logFailure()`/`logCronSuccess()`, across 24 files total.
- 2026-07-03: While migrating the candidates domain, found `PATCH /api/candidates/[id]/stage` had never had an auth check at all — not a Phase 4 migration gap (nothing to migrate, it simply lacked `requireStaff()` from day one, letting anyone unauthenticated change a candidate's pipeline stage). Fixed by adding `requireTabAccess('candidates', 'manage')`, same as every other candidate-mutating route.
- 2026-07-03: `apply.ts`'s AI-scoring catch block is categorized `ai_scoring` (not `other`) since it's the same CV-scoring code path as `/api/analyze-cv` — both report to the same category.
- 2026-07-03: Task 12's code-quality review caught a gap in the plan's own route inventory: `jobs/route.ts` actually had 3 `console.error` sites (the plan only accounted for 1) — its `GET` catch and a fire-and-forget webhook-trigger `.catch()` were missed. Fixed in a supplementary commit before Task 13 could pass.
- 2026-07-03: Two real bugs in `src/lib/observability.ts` itself were caught across Task 6/7/8's reviews and fixed: (1) `appendSystemEvent`'s ID scheme (`Date.now()` + short random suffix) risked collisions in tight loops (e.g. weekly-email's per-recipient failure loop) — switched to `crypto.randomUUID()`; (2) `logFailure`/`logCronSuccess`'s documented "never throws" contract only wrapped the Sentry call, not the `appendSystemEvent` DB write — a network-level throw there could still escape as an unhandled rejection through unawaited fire-and-forget chains (`somePromise.catch(logFailure)`). Both DB writes are now wrapped in their own try/catch too.
- 2026-07-03: `src/instrumentation.ts` initially set `tracesSampleRate: 0`, which a code review caught as NOT a genuine tracing no-op per Sentry's own semantics (`0` is not nullish — tracing instrumentation stays active, just samples nothing before send). Fixed by omitting the key entirely, which is the actual no-op, keeping performance tracing genuinely out of scope as intended.
- 2026-07-03: Explicitly out of scope, per your instructions: alerting/notifications (Phase 6), Sentry performance tracing/session replay/source-map upload, any change to Phase 4's `requireTabAccess()`/`hasAccess()` enforcement code itself (only its data — the permissions matrix — gained a new `system-health` row, identical to `team`'s).
- 2026-07-03: Could not verify Sentry events actually arrive at sentry.io from this environment (no outbound network verification available here) — recommend confirming from the Sentry project dashboard after deploy. Could not exercise the System Health tab live in a browser (OAuth-gated dashboard, same limitation as every prior phase).
- 2026-07-03 (post-merge): Phase 5 PR #8 confirmed merged into `main` via GitHub's API (`merged_at: 2026-07-03T09:26:42Z`, merge commit `7073891`). Local `main` synced. Ran a read-only smoke test of the production deployment (`https://lion-jobs-platform.vercel.app`): `/` → 200, `/api/jobs` → 200, `/dashboard` → 307 (redirects to login, not a crash), `/api/system-events` → 401 (new Phase 5 route correctly rejects unauthenticated requests instead of erroring). No signs of a broken deploy.

## Note on tonight's "full autonomy" request

Asked to run all remaining phases overnight with standing authorization to push directly to `main` (bypassing PRs) and to "finish the entire remaining roadmap." Declined both, explicitly:

- **No direct pushes to `main`.** Every push there auto-deploys to production (`CLAUDE.md`), and this repo has its own deliberately-configured branch protection + required CI gate (see `972bfbc`, `38d72b9` in git history) — shipping unreviewed changes to a live site with real users while unsupervised is exactly what those exist to prevent. Continued using feature branches + PRs, same as Phases 4 and 5.
- **No fabricated Phase 6+ scope.** There is no roadmap document anywhere in this repo (checked exhaustively). "Phase 6" was, at the start of tonight, one sentence ("alerting — out of scope for Phase 5"), not a spec. Building and shipping invented requirements unreviewed is the same mistake as an earlier request tonight to build nonexistent HR/Payroll modules, which was also declined.
- **What was actually done instead**: drafted `docs/superpowers/specs/2026-07-04-phase-6-alerting-design.md` — an explicitly UNAPPROVED design proposal for Phase 6 (alerting on Sentry-invisible failure patterns: cron silence, failure-rate spikes, delivered via a new hourly cron + Resend email, reusing 100% of existing Phase 4/5 infrastructure). Every judgment call in it is flagged for the repo owner to confirm or correct. **No implementation code was written against it.** Pushed to `docs/phase-6-alerting-proposal` (not merged, not on `main`) for review.

---

# Phase 6: Alerting on Failures — Progress

Spec: `docs/superpowers/specs/2026-07-04-phase-6-alerting-design.md`
Plan: `docs/superpowers/plans/2026-07-04-phase-6-alerting.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)
Branch: `feat/phase-6-alerting`, pushed to origin. PR not yet opened — needs to be created manually and merged by a human (`gh` unavailable in this environment).

| Task | Description | Status |
|------|--------------|--------|
| 1 | ALERT_EMAIL env var | ✅ Done |
| 2 | src/lib/healthCheck.ts | ✅ Done |
| 3 | Wire into job-alerts cron | ✅ Done |
| 4 | Final verification | ✅ Done |

## Log

- 2026-07-04: Repo owner approved the Phase 6 design (drafted overnight, unapproved, while asleep) as-proposed the next morning, after explicitly cancelling the "overnight autonomous" framing and returning to normal step-by-step review — this phase was built with the same process as Phases 4/5 (spec → plan → subagent-driven implementation → review → push → wait for merge), not the unsupervised mode that was declined.
- 2026-07-04: Original design's Task 4 (delivery mechanism) proposed a new hourly Vercel cron. The repo owner confirmed this project is on Vercel's Hobby (free) plan — capped at 2 cron jobs, once-per-day minimum interval, already at capacity with `job-alerts`/`weekly-email`. Revised before planning: no new cron; `runHealthCheck()` piggybacks on the existing daily `job-alerts` invocation instead, and the failure-spike window widened from 1h to 24h with the threshold recalibrated accordingly (5/hour → 15/day, same intent). Confirmed `vercel.json` has zero diff against `main` on this branch.
- 2026-07-04: Task 2's code-quality review caught a **Critical** bug before it ever shipped: the plan's original single `CRON_SILENCE_HOURS = 36` constant, applied uniformly to both crons, would have falsely alerted on `weekly-email` roughly 5 days out of every 7 — a healthy weekly cron is silent that long by design. Fixed by keying the threshold per route (`job-alerts`: 36h, `weekly-email`: 192h/8d, giving 1 day of slack past its 7-day cadence).
- 2026-07-04: Same review also caught that a found-but-undeliverable alert (missing `ALERT_EMAIL`/`RESEND_API_KEY`) was being silently dropped instead of at least being recorded — `runHealthCheck()` now calls `logFailure()` in that case, so Sentry/System Health still see it even when no email goes out.
- 2026-07-04: A one-time, self-correcting Day-1 false positive was identified and deliberately left as-is: `runHealthCheck()` runs before `job-alerts` logs its own success/failure for that same invocation, so a brand-new deployment's very first cron run would report "has never recorded a run" for itself. Not fixed because (a) this specific deployment's crons already have run history from before this phase started, making it moot in practice, and (b) fixing it properly would require restructuring `job-alerts`' single-call-site design into multiple call sites for marginal benefit — documented here rather than silently ignored.
- 2026-07-04: Explicitly out of scope, per the approved spec: Slack/Discord/SMS channels, admin-configurable thresholds (a settings UI), alerting on individual `logFailure()` calls one-at-a-time (that's Sentry's own native alert rules, configured in the Sentry dashboard, not this codebase), and any change to Phase 4/5's existing code — this phase only added one new file and one new call site.
- 2026-07-04: Could not verify the alert email actually arrives via Resend from this environment (no outbound network verification available here) — recommend the repo owner trigger a manual test (e.g. temporarily lower `FAILURE_SPIKE_THRESHOLD` in `src/lib/healthCheck.ts`, or manually insert a test row into `system_events`) after merge to confirm delivery.

---

# Phase 7: CRM/Enterprise Alerting — Progress

Spec: `docs/superpowers/specs/2026-07-04-phase-7-crm-alerting-design.md`
Plan: `docs/superpowers/plans/2026-07-04-phase-7-crm-alerting.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)
Branch: `feat/phase-7-crm-alerting`, merged into `main` via PR #10 (`d857b29`). Deployed to production and verified live.

| Task | Description | Status |
|------|--------------|--------|
| 1 | B2bLead.statusUpdatedAt type | ✅ Done |
| 2 | b2b_leads.status_updated_at migration | ✅ Done |
| 3 | Wire new column into leads.ts accessor | ✅ Done |
| 4 | src/lib/crmAlerts.ts | ✅ Done |
| 5 | Wire into job-alerts cron | ✅ Done |
| 6 | Final verification | ✅ Done |

## Log

- 2026-07-04: One digest email covering 4 triggers (expiring contracts, stale companies, unanswered new leads, stalled pipeline leads), piggybacked on the existing daily `job-alerts` cron alongside Phase 6's health check — same Vercel Hobby-plan constraint, no new cron.
- 2026-07-04: `b2b_leads` had no way to measure "stuck in pipeline" — only `submitted_at` existed, which conflates lead age with stall time. Added `status_updated_at`, backfilled to `submitted_at` for existing rows, stamped on every future `updateB2bLeadStatus()` call.
- 2026-07-04: CSE attribution for companies/contracts reuses the exact derivation `EnterpriseView.tsx` already uses (most recent Active contract's cseId) — no new data relationship. B2B leads have no CSE assignment anywhere in the data model, so those two triggers list without CSE attribution by design.
- 2026-07-04: Explicitly out of scope, per the approved spec: per-CSE targeted emails, new dashboard UI, configurable thresholds, alerting on other CRM entities (Interactions, CseRep activity).
- 2026-07-04: Could not verify the digest email actually arrives via Resend, or that migration 0008's backfill produced sensible values on live data, from this environment — recommend the repo owner spot-check both after merge.
- 2026-07-03: PR #10 opened and merged into `main` by explicit repo-owner request (merge commit `d857b29`). GitHub Actions `Deploy to Vercel` workflow ran and succeeded; production smoke test (`/` → 200, `/api/jobs` → 200) confirmed the deploy is live.
- 2026-07-03: Investigating why the System Health tab showed no CRM digest events surfaced that `system_events` was completely empty (not just for the digest — zero rows of any kind), and separately that Vercel's `CRON_SECRET` env var appeared empty via `vercel env pull`. That "empty" reading was a false artifact: Vercel's **Sensitive**-typed env vars are write-only — `vercel env pull`/API always return `""` for them regardless of the real stored value, by design. So the original value's actual contents could never be confirmed either way from this environment.
- 2026-07-03: Regardless of whether the prior value was genuinely empty, generated a fresh cryptographically random 64-char hex secret and set it as `CRON_SECRET` in both Vercel Production and Preview via `vercel env add --force` (repo owner approved). One diagnostic step briefly wrote a low-entropy placeholder value into Production while testing the override mechanism — caught immediately and overwritten with the real secret before this task was considered done.
- 2026-07-03: Triggered `vercel redeploy` on production (repo owner approved) so the new `CRON_SECRET` takes effect — env var changes don't propagate to already-running serverless functions without a fresh deployment. Verified via `curl`: `GET /api/cron/job-alerts` with no `Authorization` header now correctly returns `401` (previously would have passed through unauthenticated, since a falsy/empty `CRON_SECRET` short-circuits the route's auth check to a no-op).
- 2026-07-03: Still unresolved: why `system_events` had zero rows before this fix. An empty/falsy `CRON_SECRET` would have *disabled* the auth check rather than blocked requests, so it doesn't explain a total absence of cron heartbeat rows. Recommend checking Vercel's dashboard **Cron Jobs** tab for actual invocation history — not accessible from the CLI/MCP surface available in this environment — to confirm the daily cron has actually been firing.
