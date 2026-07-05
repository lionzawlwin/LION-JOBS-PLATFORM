# CTO Handover — Lion Jobs Agency Platform

This document is written for a human successor, not an AI agent — for
agent-facing operating instructions see `CLAUDE.md`. It synthesizes
`CLAUDE.md`, `PROGRESS.md`, and the design specs under
`docs/superpowers/specs/` into one onboarding read. Where this document is
silent or wrong, those source documents are the ground truth — this is a
summary, not a replacement.

## What this system is

A Next.js 16 job board + internal recruiting/CRM admin console for Lion Jobs
Agency (Myanmar). Public job board, candidate application flow, and a
13-tab internal dashboard (Overview, Candidates, Post Job, Manage Jobs,
Companies, Enterprise/CRM, B2B Leads, Content Studio, Email Campaigns,
Legal, Billing, Team & Access, System Health) used by agency staff.

## Architecture at a glance

```
Supabase Postgres (RLS enabled on every table)
    ↓  service role key, server-side only
src/lib/db/*.ts          ← one accessor module per domain, re-exported from index.ts
    ↓
src/app/api/**/route.ts  ← Next.js Route Handlers
    ↓  fetch, Cache-Control / SWR
src/hooks/use*.ts         ← SWR hooks, client-side only
    ↓
React components
```

The public job board (`/candidate`) uses real server-side query-pushdown
pagination (Phase 13): `useJobs.ts` calls `/api/jobs` with `limit`/`offset`
plus filter params, and `getJobsPaginated()` in `src/lib/db/jobs.ts` pushes
keyword/category/type/location/salary filtering into Supabase — the browser is
not filtering a full in-memory dataset. Dashboard management views that need an
effectively-complete list still fetch a large capped page (1000-row ceiling) and
filter client-side via `filterJobs()` in `useJobs.ts`.

Two integrations run alongside the Supabase data layer, both unrelated to
each other:
- `src/lib/drive.ts` — Google Drive for candidate CV storage (service account).
- Resend — transactional email, weekly digest, and both Phase 6/7 alert
  emails.

A previous Google Sheets + Make.com webhook data layer was fully removed in
mid-2026 (see `docs/superpowers/plans/2026-06-30-supabase-migration.md`).
`src/lib/sheets.ts`/`makeWebhook.ts` no longer exist — don't reintroduce them.

## Access control

`src/lib/authOptions.ts` gates `/dashboard` via Google OAuth (NextAuth),
checked against a `staff` table (`role`: `owner`/`admin`/`cse`/`viewer`,
`active`). `ADMIN_EMAIL` is a permanent fallback in `authOptions.ts` only —
always works regardless of the `staff` table's state, so the account this
system originally belonged to can never be locked out by a bad roster edit.

Enforcement is per-tab/per-action since Phase 4: `requireTabAccess(domain,
level)` in `src/lib/auth.ts` checks a hard-coded (role × tab) → access-level
matrix in `src/lib/permissions.ts`. `owner`/`admin` have full access
everywhere; `cse` gets full access to Companies/Enterprise/B2B Leads plus
view-only on Legal/Billing/Overview; `viewer` is read-only everywhere except
Post Job/Team. System Health (added Phase 5) follows Team & Access's row —
`owner`/`admin` only, `cse`/`viewer` have no access. Role changes take effect
on the staff member's **next login**, not immediately (it's baked into the
JWT at sign-in).

**Row-level scoping for `cse` (Phase 10)**: a new nullable `staff.cse_rep_id`
(migration `0011`, applied to Production) links a `cse`-role login to a
`cse_reps` row, attached to the session/JWT the same way `role` is.
`GET /api/companies`, `/api/contracts`, and `/api/interactions` scope to
that link server-side — **application-layer filtering, not a Postgres RLS
policy** (this app's service-role Supabase client bypasses RLS entirely,
see `0006_enable_staff_rls.sql`'s own comment, so a policy here would be
silently ineffective). An unlinked `cse` (`cse_rep_id: NULL`) fails closed —
sees an empty list, not everything. **`b2b_leads` is explicitly NOT
scoped** — that table has no CSE-assignment concept in its data model at
all; inventing one is a real product decision, not a technical gap. See
`docs/superpowers/specs/2026-07-04-phase-10-cse-row-scoping-design.md`.

**Status as of 2026-07-05**: Phases 4–27+ are complete and live. The CSE
scoping (Phase 10, migration `0011`) is the most recent change to this
section — `staff.cse_rep_id` is in Production. No `cse`-role staff existed
in the roster at Phase 10's merge, so the fail-closed empty-view for unlinked
CSE staff has not yet been observed live. See `PROGRESS.md` for the full
phase changelog.

## Environment variables

See `CLAUDE.md`'s table for the full list with descriptions. The two most
operationally important ones for day-to-day ops:
- `CRON_SECRET` — authenticates Vercel's daily cron hits to `/api/cron/*`.
  Stored as a Vercel **Sensitive** environment variable — once set, it
  cannot be read back via `vercel env pull`, the API, or the dashboard UI
  (it always returns an empty string for Sensitive vars, by design). You can
  only overwrite it (`vercel env add CRON_SECRET production --force --value=...`)
  and test the new value, never retrieve the old one.
- `ALERT_EMAIL` — where Phase 6 (cron silence / failure-spike) and Phase 7
  (CRM digest) alert emails go. Optional; unset = both silently no-op.

## Deployment

Push to `main` → **Vercel's native GitHub integration** deploys automatically
(preview for PRs, production for `main`) — this is dashboard-configured on
Vercel's side, not driven by any file in this repo. `.github/workflows/deploy.yml`
no longer runs `vercel deploy`; its sole job is the quality gate — `npm test` +
`npm audit` as required status checks on every PR. `ci.yml` runs `next build` +
`tsc --noEmit`. Both must pass before merge. Branch protection enforces this;
direct pushes to `main` are rejected outright by GitHub (`GH006`).

## Database migrations

Read `supabase/MIGRATIONS.md` in full before writing or applying one — it
has the complete history of how this repo's migration tracking was
bootstrapped and repaired, plus a hard-learned lesson: **every new
`CREATE TABLE` must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in
the same migration** (the `staff` table shipped without it in `0005` and had
to be fixed forward in `0006`).

Process: write `supabase/migrations/NNNN_description.sql` with `IF NOT
EXISTS` guards, `npx supabase db push`, then `npx supabase migration list`
to confirm local/remote agree — **verify, don't assume it worked.**

As of this document, migrations run through `0021` (see `MIGRATIONS.md` and
`supabase/migrations/` for the full breakdown). Key landmarks:
- `0011` — Phase 10: `staff.cse_rep_id` (CSE row scoping)
- `0016` — `jobs` ↔ `companies` FK
- `0017` — `role_permissions` table (Layer 6 Dynamic RBAC)
- `0018` — `stats_history` table (daily snapshot cron)
- `0021` — audit log table (in progress, see open PRs)

All through `0018` are applied to Production. `0019`–`0021` status: check
`npx supabase migration list` against the live project to confirm.

## Cron jobs

Three cron jobs are declared in `vercel.json` and confirmed registered on
Vercel (verified via `npx vercel crons ls`, 2026-07-05):
- `/api/cron/job-alerts` (`0 9 * * *`, daily) — posts new jobs to
  Telegram/Facebook, and since Phase 6/7 also runs `runHealthCheck()` and
  `runCrmDigest()` at the start of the same invocation (piggybacked, not
  separate crons). Confirmed firing daily; last run 2026-07-05T09:13 UTC.
- `/api/cron/weekly-email` (`0 9 * * 1`, Mondays) — weekly digest email.
- `/api/cron/snapshot-stats` (`0 0 * * *`, daily midnight UTC) — records
  daily aggregate counts to `stats_history` for Overview trend charts (Phase PR #59).

All three are authenticated via `CRON_SECRET` (see above). Use
`npx vercel crons ls` to check registration status. The System Health
dashboard tab shows the last run time and status of each monitored cron.

## Runbook: rotating `CRON_SECRET`

1. Generate a new value: `openssl rand -hex 32`.
2. Set it in both environments: `vercel env add CRON_SECRET production
   --force --value="<value>"` and again with `preview` instead of
   `production`.
3. **Redeploy** — env var changes do not propagate to already-running
   serverless functions: `vercel redeploy <production-url> --target production`.
4. Verify: `curl` the cron route with no `Authorization` header (expect
   `401`), then with `Authorization: Bearer <value>` (expect `200` — note
   this actually executes the real cron logic, not a dry run, so be aware
   of side effects like a live Telegram post).

## Observability

- Sentry captures unhandled exceptions (`src/instrumentation.ts`) plus
  explicit `logFailure()` calls at every handled `catch` block. `SENTRY_DSN`
  unset = no-op, same as every other optional integration in this repo.
- A local `system_events` Supabase table (Phase 5) backs the System Health
  dashboard tab so it doesn't depend on a live Sentry API call at page load.
  As of Phase 8 it's indexed on `(category, route, created_at)` for
  cron-status lookups and `(level, category, created_at)` for the dashboard's
  general error listing — see `supabase/migrations/0009` and `0010`.
- **`system_events` is confirmed populating normally** (resolved 2026-07-05):
  direct Supabase REST query showed `job-alerts` fired at 09:13 UTC today and
  previously on 2026-07-03 — both logged correctly. The earlier "empty table"
  mystery (Phase 7 follow-up) was a `CRON_SECRET` misconfiguration that caused
  fail-open auth (secret was blank/falsy, disabling the check rather than
  blocking — no requests were rejected, but something else caused the absence of
  rows at the time). That is now fixed; the table is healthy.
- Sentry alert rules (e.g. paging on spike thresholds) are configured in
  the Sentry dashboard itself, not in this codebase — nothing here manages
  that config.

## Testing

`npm test` (Vitest) — as of 2026-07-05, **68 tests across 6 test files**,
covering: `apiSecurity.ts` (rate limiting), `permissions.ts` (RBAC matrix),
`portalAuth.ts` (magic-link token hashing + session signing), `cseScope.ts`
(CSE rep attribution), and `algorithmicMatch.ts` (matching algorithm).
Coverage is intentionally targeted at pure/unmocked logic — the highest-risk
surfaces that need no mocking infrastructure. No DB-accessor or route-level
tests exist yet (would need a `@supabase/supabase-js` mock this repo doesn't
have). `npm test` is a required CI gate in `deploy.yml` — a failing test
blocks merge.

## Recent milestones (since Phase 10)

This document was originally written at Phase 10. Significant additions since:

- **Sprint 2 (Company + Candidate Portals)** — Magic-link portal auth for
  both candidates and employers. Tokens HMAC-signed with `PORTAL_SESSION_SECRET`,
  SHA-256 hash stored in DB. Routes: `/candidate/portal`, `/company/portal`.
- **Phase 11 (Homepage Chooser + Sidebar)** — `/` is now a chooser landing;
  `/candidate` and `/company` are the separate public-facing flows.
- **Phase 13 (Jobs Pagination)** — Server-side query-pushdown pagination on the
  public job board (see Architecture section).
- **Phase 17 (Algorithmic Matching)** — Zero-API-call 100-pt scoring for
  candidate↔job fit (`src/lib/matching/algorithmicMatch.ts`).
- **Phase 20 (API Security Hardening)** — In-memory rate limiter, HMAC
  `ADMIN_KEY` auth hardening, `CRON_SECRET` fail-open fix.
- **Phase 21 (Dashboard Caching)** — `unstable_cache` + `force-dynamic` for
  selected dashboard routes.
- **Phase 27 (CI Reliability)** — Route-protection CI check; `deploy.yml`
  refactored to quality-gate-only (removed redundant Vercel CLI deploy step).
- **Layer 6 Dynamic RBAC** — DB-backed `role_permissions` table
  (`0017_add_role_permissions.sql`) with async `getAccessLevel()`;
  hardcoded matrix as fail-closed fallback.

See `PROGRESS.md` for the full phase-by-phase changelog with PR numbers and
commit hashes. Open PRs as of 2026-07-05: #70 (snapshot-stats health
monitoring fix), and `feat/audit-log` branch (migration `0021`).

## Where to find more history

- `PROGRESS.md` — phase-by-phase changelog, most detailed operational log,
  including exact commit hashes and what code review caught at each step.
- `docs/superpowers/specs/*.md` — one design spec per phase, each with an
  explicit Goals/Non-goals section.
- `docs/superpowers/plans/*.md` — one implementation plan per phase, with
  exact code diffs for every change made.
