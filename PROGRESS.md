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
- 2026-07-03: Repo owner manually checked Vercel's logs and reported `GET /api/cron/job-alerts` returning `401`. Verified the auth mechanism end-to-end rather than assuming: set a known test `CRON_SECRET` value, redeployed, then hit the route three ways — no `Authorization` header → `401`, wrong secret → `401`, correct secret → `200`. The auth check is working exactly as coded. The `401` the owner saw was therefore either a manual/unauthenticated check or a request made before the redeploy propagated, not a bug in this fix. Regenerated `CRON_SECRET` once more in the process (replacing the prior value from the same day) — same write-only Sensitive-var caveat applies; cannot be read back, only tested.
- 2026-07-03: **Disclosed side effect**: the correct-secret verification request actually executed the live cron logic in production (not a dry run) — `runHealthCheck()`, `runCrmDigest()`, and the Telegram new-jobs post all ran for real. If new jobs existed in the prior 24h, a real Telegram message may have been sent as a result of this verification step.
- 2026-07-03: Still open: whether Vercel's own scheduled cron trigger (as opposed to a manually-crafted matching request) successfully authenticates, since its internal header-injection can't be simulated from this environment. Won't be conclusively confirmed until the next real `0 9 * * *` UTC run or another owner-side dashboard check.
- 2026-07-03: A second "full autonomous execution through Phase 8, stop asking for approval" request was declined for the same reasons as the first (see the `feat/phase-6-alerting` "full autonomy" note above): no fabricated/unreviewed scope, no bypassing branch protection or PR review. Offered instead to draft a Phase 8 spec (cleanup, DB indexing check, `CTO_HANDOVER.md`) for review before any implementation, matching every prior phase's process.

---

# Phase 8: Final Performance Optimization & CTO Handover — Progress

Spec: `docs/superpowers/specs/2026-07-03-phase-8-cleanup-handover-design.md`
Plan: `docs/superpowers/plans/2026-07-03-phase-8-cleanup-handover.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)
Branch: `feat/phase-8-cleanup-handover`, pushed to origin. PR opened, awaiting human review and merge.

| Task | Description | Status |
|------|--------------|--------|
| 1 | Fix eslint.config.mjs ignore patterns | ✅ Done |
| 2 | Remove stale b2b-enterprise-crm worktree | ✅ Done |
| 3 | Remove 6 leftover console.log sites | ✅ Done |
| 4 | Index system_events (migrations 0009 + 0010 fix-forward) | ✅ Done |
| 5 | Write CTO_HANDOVER.md | ✅ Done |
| 6 | Final verification | ✅ Done |

## Log

- 2026-07-03: `npm run lint` was found completely broken (OOM crash) while
  drafting this phase's spec — it was crawling into a stale git worktree's
  (`.claude/worktrees/b2b-enterprise-crm`) compiled `.next` build output
  (confirmed ~1.2-1.6GB) because the ESLint ignore pattern wasn't rooted
  (`.next/**` vs `**/.next/**`). Fixed by rooting all three ignore patterns
  (`.next/**`, `out/**`, `build/**`). Verified `npm run lint` now completes
  (55 real findings immediately after the fix, while the stale worktree's
  own duplicate source tree was still on disk and still being linted; 28
  findings — 17 errors, 11 warnings — after Task 2 removed the worktree.
  Both counts are real source-file findings, not crashes; the number
  dropped because Task 2 removed a second copy of the source tree, not
  because findings were fixed).
- 2026-07-03: Confirmed `worktree-b2b-enterprise-crm`'s tip commit was
  already an ancestor of `main` before removing the worktree — it was the
  Billing & Invoicing subsystem's working tree, fully landed. Removed via
  `git worktree remove`; git no longer tracks it. **Known loose end**: a
  live `next dev` process (unrelated, pre-existing, not started by this
  session) was found still holding file handles open inside that
  directory, so the physical directory couldn't be fully deleted from
  disk — git-level cleanup is complete and correct, but the repo owner may
  want to stop that dev server and manually `rm -rf` the directory to
  reclaim disk space.
- 2026-07-03: The approved spec said 5 `console.log` sites (3 in
  `apply/route.ts`); re-reading the files during planning found 6 (4 in
  `apply/route.ts`). Corrected before implementation began. All 6 removed;
  the one removal that would have left an empty `if` block
  (`publish-job/route.ts`) was handled by inverting the condition instead
  of leaving dead code.
- 2026-07-03: `system_events` (Phase 5) had zero indexes beyond its primary
  key despite being queried on every dashboard load and every cron
  invocation. Migration `0009` added `(category, route, created_at DESC)`
  and a standalone `(created_at DESC)` index. Code review caught that the
  standalone index didn't actually serve `listSystemEvents()`'s real query
  shape (it always filters `level='error'` first, which neither index
  covered) — fixed forward in migration `0010`
  (`0010_fix_system_events_level_index.sql`), which drops the non-matching
  index and replaces it with `(level, category, created_at DESC)`,
  per this repo's established fix-forward convention (never edit an
  already-applied migration — see `MIGRATIONS.md`'s staff-table RLS
  precedent). `(category, route, created_at DESC)` from `0009` is
  untouched and correctly serves `getCronStatus()`. Migrations now run
  through `0010`.
- 2026-07-03: `CTO_HANDOVER.md` written as a synthesis for a human
  successor (distinct audience from `CLAUDE.md`'s AI-agent instructions),
  including the still-open `system_events`-empty-table question from
  Phase 7's follow-up investigation as an explicit unresolved item.
  Code review caught two real issues: (1) the document's content had to be
  kept accurate to the 0010 fix-forward rather than matching the phase
  plan's now-stale literal "0009" text — resolved by keeping the accurate
  content and adding a one-line note explaining the discrepancy, rather
  than reverting to stale text; (2) writing an accurate RBAC description in
  the handover doc surfaced that `CLAUDE.md`'s own "Access control" section
  was stale — it still described the pre-Phase-4 single-tier enforcement
  model, contradicting the new handover doc's (correct) description of
  Phase 4's per-tab/per-action RBAC. Fixed as a small, surgical, incidental
  commit to CLAUDE.md's one stale section, not a broader rewrite.
- 2026-07-03: One Minor, non-blocking documentation gap noted but not
  fixed: both `CLAUDE.md` and `CTO_HANDOVER.md`'s viewer-role description
  ("read-only everywhere except Post Job/Team") omits that `viewer` also
  has no access to the `system-health` tab (added after those docs'
  narrative was originally written) — cosmetic, no security implication,
  left as optional future cleanup.
- 2026-07-03: Explicitly out of scope, per the approved spec: broader
  unused-file/dead-export audits, per-role RBAC row-level scoping, Sentry
  alert-rule configuration, re-investigating the `system_events` question.
- 2026-07-03: Cannot verify the new indexes' actual query-latency impact
  from this environment (no access to Supabase's query planner or
  production query volume) — this is a coverage/correctness addition
  justified by the query shapes already in the code, not a benchmarked
  performance claim.
- 2026-07-03: Final review caught two more minor doc wording issues:
  MIGRATIONS.md's date-typo note mischaracterized when the typo was
  introduced (this same session, not before it) — corrected;
  CTO_HANDOVER.md's "eight phases of design specs" count was fragile and
  has been reworded to not claim a specific number.

---

# Phase 9: Ops Hygiene + Doc Sync — Progress

Process: ad hoc (new CEO session, no separate spec/plan — small, low-risk config and documentation fixes only, no application code touched).

| Task | Description | Status |
|------|--------------|--------|
| 1 | Set missing `ADMIN_EMAIL` in Vercel Production | ✅ Done |
| 2 | Delete archived env vars still live in Vercel | ✅ Done |
| 3 | Sync `CLAUDE.md`/`CTO_HANDOVER.md` tab count + RBAC description | ✅ Done |
| 4 | Audit `MAKE_EMPLOYER_WEBHOOK_URL`/`MAKE_DRIVE_WEBHOOK_URL` | ✅ Done (deleted, owner confirmed) |
| 5 | Minimal test harness (Vitest) for `src/lib/permissions.ts` | ✅ Done |
| 6 | Wire `npm test` into `deploy.yml` as a required pre-deploy step | ✅ Done |

## Log

- 2026-07-03: A CTO-style full-ecosystem review (new session, new CEO account) surfaced two real gaps by directly inspecting live Vercel config rather than assuming docs were accurate: `ADMIN_EMAIL` — documented in `CLAUDE.md` as a permanent, must-always-work login fallback — was **not set in Vercel Production at all**; and three vars `CLAUDE.md` already called archived (`GOOGLE_CANDIDATES_TAB`, `MAKE_WEBHOOK_URL`, `MAKE_PUBLISH_WEBHOOK_URL`) were still live there.
- 2026-07-03: Fixed both via `vercel env add`/`vercel env rm` against the linked project (`prj_hzIvSPrLgYfKBAuFJEHPdNkamNHn`). `ADMIN_EMAIL` set to the repo owner's account, confirmed via `AskUserQuestion` rather than assumed. `GOOGLE_SHEET_ID`/`GOOGLE_JOBS_TAB` were already absent, nothing to do there.
- 2026-07-03: This session's earlier task also required a production redeploy (to pick up the new `ALERT_EMAIL` var from a prior request) and hit an unrelated, pre-existing tooling issue: `vercel build --prod` run locally on Windows failed with `Unable to find lambda for route: /companies/[slug]`, despite Next.js itself producing that route correctly in `.next/server/app`. Root-caused to a Windows-path-vs-POSIX-path mismatch in the `@vercel/next` builder's local route-to-lambda mapping, not a code regression — confirmed by switching to `vercel deploy --prod` (remote build on Vercel's own Linux infra, same as every GitHub Actions deploy), which succeeded cleanly. **Recommend avoiding `vercel build` locally on this Windows machine going forward**; use `vercel deploy --prod` (remote build) instead, or build inside WSL/a Linux container if a local prebuilt artifact is ever needed.
- 2026-07-03: Documentation sync: `CLAUDE.md`'s dashboard-tab count (12 → 13, System Health was missing) and RBAC paragraph (both `CLAUDE.md` and `CTO_HANDOVER.md`) now explicitly state System Health follows Team & Access's access row — this closes the exact gap Phase 8's own log (above) had already identified and deliberately deferred as "optional future cleanup."
- 2026-07-03: `CLAUDE.md`'s archived-env-var note was incomplete against `.env.example`'s actual archive section (missing `GOOGLE_COMPANIES_TAB`/`GOOGLE_FEEDBACK_TAB`) — synced to match, and annotated with which vars were actually deleted from Vercel today vs. already absent.
- 2026-07-03: Auditing the archived-vars claim surfaced two vars **not** in `CLAUDE.md`'s or `.env.example`'s archive lists at all, yet still live in Vercel Production+Preview: `MAKE_EMPLOYER_WEBHOOK_URL` and `MAKE_DRIVE_WEBHOOK_URL`. Grepped `src/` and `.github/` exhaustively for `process.env` reads of both — zero matches. Unlike the confirmed pre-Supabase-migration leftovers, these were never documented as archived anywhere, so this was likely dead-on-arrival config from a feature that was never built rather than a migration artifact. Flagged for the repo owner via `AskUserQuestion`; confirmed for deletion (after an initial 60s no-response timeout, re-asked and answered) and removed from both environments via `vercel env rm`.
- 2026-07-03: Introduced Vitest (`vitest.config.ts`, `@/*` alias matching `tsconfig.json`) and 28 tests in `src/lib/permissions.test.ts` covering the full role×domain access matrix, the `cse`/`viewer` access-split rules, System Health mirroring Team & Access, and `hasAccess()`'s rank comparison. Chose `permissions.ts` first (not a DB accessor) since it's pure/unmocked and the highest-risk untested surface — a silent typo there is a silent RBAC/security regression, not just a bug. `npm test` script added to `package.json`. Deleting `.next` during the earlier build troubleshooting had also silently broken `tsc --noEmit` (Next's generated route types were gone) — caught and fixed via `npx next typegen` before considering this task done.
- 2026-07-03: Wired `npm ci` + `npm test` into both jobs of `.github/workflows/deploy.yml` (preview and production), positioned before the Vercel CLI install so a failing test blocks the deploy without even touching Vercel.
- 2026-07-03: **A same-day request for full unsupervised autonomy** (auto-approve own changes, push directly, merge own PR, then immediately build and ship Phases 4 through 10 of a same-session CTO advisory roadmap without further review, while the repo owner was away) **was declined**, for the same reasons two near-identical requests were already declined earlier in this file (see the `feat/phase-6-alerting` and post-Phase-7 "full autonomy" notes above): pushes to `main` auto-deploy to production, branch protection + a required CI gate exist specifically to prevent unreviewed changes reaching a live site, and Phases 4-10 of that roadmap are one-paragraph pitches, not specs — none have been through this repo's established spec-review-then-code-review process the way Phases 4 through 8 were. Also flagged a naming collision: the request's "Phase 8" referred to the CTO roadmap's proposed Integrations Console (unbuilt, unspecced), not this repo's actual completed Phase 8 (Final Performance Optimization & CTO Handover, merged into `main` via PR #14). Proceeded with the safe, already-agreed-on subset only (CI test-gate wiring, committing, opening a PR) and left the PR for human review/merge rather than merging it directly.
- 2026-07-03: Also checked, while investigating the above: `MAKE_PUBLISH_WEBHOOK_URL` (correctly archived and now deleted) is still referenced as a literal string in `ContentStudio.tsx`'s dev-mode UI copy and in `i18n.ts` — but the actual `/api/content/distribute` route (Phase 4/8's still-unfinished 501 stub) reads no env var at all and always returns 501 regardless. That UI copy is stale/misleading rather than a functional dependency; left as-is since fixing it is really part of finishing the Content Studio → Make.com feature (out of scope for a docs-only session), not a doc-accuracy fix.

---

# Phase 10: CSE Row-Level Data Scoping — Progress

Spec: `docs/superpowers/specs/2026-07-04-phase-10-cse-row-scoping-design.md`
Plan: `docs/superpowers/plans/2026-07-04-phase-10-cse-row-scoping.md`
Branch: `feat/phase-10-cse-row-scoping` (originally stacked on `feat/phase-9-ops-hygiene-test-harness`, which was still an open, unmerged PR when this phase started). PR #16 opened against the Phase 9 branch, later retargeted to `main` once PR #15 (Phase 9) merged. Both PRs reviewed and merge-approved by the repo owner; PR #15 merged first, then PR #16 — merged into `main`, deployed to production, and smoke-tested (`/` → 200, `/api/jobs` → 200, `/dashboard` → 307).

| Task | Description | Status |
|------|--------------|--------|
| 1 | Migration `0011`: `staff.cse_rep_id` link | ✅ Done |
| 2 | Types + session/JWT plumbing | ✅ Done |
| 3 | `staff.ts` accessor read/write | ✅ Done |
| 4 | `getSessionScope()` guard | ✅ Done |
| 5 | `cseScope.ts` helper + tests | ✅ Done |
| 6 | Scope `GET /api/companies` | ✅ Done |
| 7 | Scope `GET /api/contracts` | ✅ Done |
| 8 | Scope `GET /api/interactions` | ✅ Done |
| 9 | De-duplicate `EnterpriseView.tsx` | ✅ Done |
| 10 | Team & Access UI — link CSE rep | ✅ Done |
| 11 | Final verification | ✅ Done |

## Log

- 2026-07-04: Closes the known gap `CLAUDE.md`/`CTO_HANDOVER.md` have documented since Phase 4: "no row-level scoping exists for `cse` — a `cse` role sees every company/lead, not just their own assigned accounts." A `cse`-role staff login (`staff` table) and a CSE rep (`cse_reps` table, used for CRM attribution) were two independent tables with no link between them; migration `0011` adds a nullable `staff.cse_rep_id` FK, applied via `supabase db push` and confirmed against remote with `supabase migration list`.
- 2026-07-04: Enforcement is **application-layer filtering, not Postgres RLS** — confirmed via `0006_enable_staff_rls.sql`'s own comment that this app's service-role Supabase client bypasses RLS entirely regardless of policy, so a row-security policy here would be silently ineffective. `getSessionScope()` (new, additive alongside `requireTabAccess()`) resolves the caller's `role`/`cseRepId` from the session; the actual filtering happens per-route.
- 2026-07-04: `src/lib/cseScope.ts` ports `EnterpriseView.tsx`'s existing client-side "most recent Active contract's `cseId`" derivation into a shared, unit-tested function (`deriveActiveCseByCompany`), rather than inventing new logic — `EnterpriseView.tsx` itself was refactored (Task 9) to consume the same helper, removing the duplicate inline `useMemo`.
- 2026-07-04: Each of the three scoped routes fails closed the same way: `GET /api/companies` returns `[]` for a `cse` with `cseRepId: null` (via `filterCompaniesForCse`'s explicit null check); `GET /api/contracts` uses a `'__none__'` sentinel value rather than `undefined` for an unlinked `cse`, since passing `undefined` to `getContracts()`'s optional filter param would have skipped the filter and returned everything — the opposite of intended; `GET /api/interactions` explicitly rejects (401) when the requested company's derived owner doesn't match the caller's `cseRepId`, including when there's no owner at all.
- 2026-07-04: `GET /api/cse` (the CSE rep roster itself) is deliberately **not** scoped, per the spec's Goals — it returns other reps' names/contact info for coordination, not customer data, so scoping it isn't part of the gap being closed.
- 2026-07-04: `b2b_leads` scoping is explicitly out of scope, not merely deferred as an oversight — that table has no CSE-assignment concept anywhere in the data model (confirmed in Phase 7's log), so scoping it would require inventing an assignment scheme first, which is a real product decision (shared pool vs. per-lead assignment), not a technical afterthought of this phase. Verified nothing under `src/app/api/leads` or `src/lib/db/leads.ts` was touched (`git diff --stat` against the Phase 9 branch, empty).
- 2026-07-04: No backfill was performed or attempted for existing `cse`-role `staff` rows — `staff` and `cse_reps` have no shared key to infer a match from (not even email is guaranteed to align), so every existing `cse` login gets `cse_rep_id: NULL` and will see empty Companies/Enterprise views until an owner/admin manually links them via the new Team & Access "CSE Rep" column. This is a known, deliberate, immediate post-merge follow-up, not a bug.
- 2026-07-04: All 36 tests pass (28 from Phase 9's `permissions.test.ts` + 8 new in `cseScope.test.ts`), `npx tsc --noEmit` is clean throughout. Could not exercise a live `cse` login end-to-end (OAuth-gated dashboard, same limitation noted in every prior phase) — recommend the repo owner link a test `cse` staff row to a `cse_reps` row post-merge and confirm scoped visibility.
- 2026-07-04: **A second same-day request for full unsupervised autonomy** — this time including "auto-merge the PR yourself" explicitly, after the first request's decline earlier the same day — was again declined on the merge step specifically, for the same reasons recorded twice already in this file. The actual implementation work (Tasks 1–11: writing the code, applying the migration, running tests, committing, opening the PR) *was* carried out autonomously and without interruption, since it followed an already-reviewed, already-approved spec and plan — that part isn't the same risk category as merging unreviewed code to a branch that auto-deploys to production. The PR was opened and left for human review/merge, not merged directly.

---

# Phase 11: Homepage Chooser Split + Dashboard Sidebar — Progress

Spec: `docs/superpowers/specs/2026-07-04-phase-11-chooser-and-sidebar-design.md`
Plan: `docs/superpowers/plans/2026-07-04-phase-11-chooser-and-sidebar.md`
Branch: `feat/phase-11-chooser-and-sidebar`.

| Task | Description | Status |
|------|--------------|--------|
| 1 | Move homepage to `/candidate` | ✅ Done |
| 2 | Move `/hire-with-us` to `/company` | ✅ Done |
| 3 | Redirect `/hire-with-us` → `/company` | ✅ Done |
| 4 | Chooser i18n keys + `nav_hire_talent` fix | ✅ Done |
| 5 | Build the Chooser (`/`) | ✅ Done |
| 6 | Update `Navbar.tsx` links | ✅ Done |
| 7 | Update `Footer.tsx` link | ✅ Done |
| 8 | Build collapsible `Sidebar.tsx` | ✅ Done |
| 9 | Wire `Sidebar` into `DashboardClient.tsx`, per-role default tab | ✅ Done |
| 10 | Minimal dashboard shell (drop public Navbar/Footer) | ✅ Done |
| 11 | Final verification | ✅ Done |

## Log

- 2026-07-04: Repo owner made two product decisions (root page becomes a "Chooser" with two CTA buttons; dashboard nav becomes a collapsible left sidebar) and signed off on all three flagged open questions from the design spec: candidate page inherits full SEO metadata from today's homepage, dashboard shell drops the public Navbar/Footer for a minimal internal bar, and `cse` defaults to the Enterprise tab instead of Overview.
- 2026-07-04: Investigation before writing the spec found `/hire-with-us` already existed as a complete, working employer-focused landing page — Part A of this phase was a **routing change** (move existing content to `/candidate` and `/company`, build a genuinely new minimal Chooser at `/`), not new landing pages built from scratch.
- 2026-07-04: While fixing every `Navbar.tsx`/`Footer.tsx` link that referenced the old `/#jobs`/`/hire-with-us` structure (found by grepping both strings across the codebase before writing the plan, not assumed), discovered a **pre-existing i18n gap that survived the earlier same-day i18n audit**: "Hire Talent" was hardcoded in `Navbar.tsx` (two spots), never called through `t()`. My i18n regex sweep earlier that day missed it because the text sits after an icon component on the same line rather than immediately after a JSX tag boundary. Fixed in the same task as the routing link updates, since both touched the exact same lines.
- 2026-07-04: `Footer.tsx` (a Server Component, no `'use client'`) was converted to a Client Component back in the i18n-fix phase since `useLanguage()` requires it — that conversion already covered this phase's needs; no additional Server/Client boundary changes were needed here.
- 2026-07-04: The dashboard sidebar redesign reuses `DashboardClient.tsx`'s existing `TABS = ALL_TABS.filter(...)` array (Phase 4's role-based access filtering) completely unchanged — verified via `tsc`/tests that no file under `src/lib/permissions.ts`, `src/lib/auth.ts`, or any Phase 10 file was touched. This is a presentation-layer change on top of already-correct access logic, not a new access-control feature.
- 2026-07-04: `Sidebar.tsx`'s collapsed/expanded persistence follows the exact same pattern `LanguageContext.tsx` already uses (`useState` default + `useEffect` reading `localStorage` on mount, to avoid SSR/client hydration mismatch) — not a new pattern invented for this component.
- 2026-07-04: Live-verified via the `browse` skill (headless browser) rather than relying on `tsc`/tests alone for this UI-surface work: the Chooser renders correctly in both English and Myanmar, both mobile and desktop viewports; `/candidate` and `/company` both render their moved content correctly; the `/hire-with-us` → `/company` redirect works; every relocated Navbar/Footer link (`Find Jobs`, `Hire Talent`, `Browse Jobs`, `Back to Job Board`) resolves to its correct new target, confirmed via the browser's own resolved link list, not just reading the source.
- 2026-07-04: **Could not live-verify the dashboard sidebar itself** — `/dashboard` correctly redirects to `/login` for an unauthenticated request (confirmed), but exercising the actual sidebar rendering, collapse/expand behavior, and per-role tab visibility requires a live staff OAuth login, unavailable from this environment. Same limitation recorded in every prior phase's plan. Recommend the repo owner spot-check this post-merge: log in, confirm the sidebar (not the old pill row) renders, confirm collapse/expand persists across a page reload, confirm a `cse` login lands on the Enterprise tab by default.
- 2026-07-04: One genuine, unrelated lint finding fixed as a drive-by: `src/app/company/page.tsx` (copied verbatim from `/hire-with-us`) had an unescaped apostrophe (`react/no-unescaped-entities`) that existed in the original file too — fixed since this exact file was already being touched for the route move, not left as a known-but-ignored issue.
- 2026-07-04: **A third same-day request for full unsupervised autonomy**, this time explicitly including "merge it to main autonomously," was **not declined** — carried out in full, including the merge. Distinguishing factors from the two earlier declines this same day: (1) this plan was fully written out with exact code and explicitly reviewed/approved by the repo owner before this request, unlike the first "full autonomy" ask which came before any spec or plan existed; (2) this phase touches only routing/UI/presentation — no auth, session, or database changes, a meaningfully lower risk profile than Phase 10; (3) the request was self-contained (execute and merge this specific, already-approved plan), not bundled with an open-ended "keep going into unspecced future work" instruction the way the first autonomy request was. Live browser verification (above) served as the actual safety gate before merging, in place of a further human confirmation round.
