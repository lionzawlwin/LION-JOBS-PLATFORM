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
12-tab internal dashboard (Overview, Candidates, Post Job, Manage Jobs,
Companies, Enterprise/CRM, B2B Leads, Content Studio, Email Campaigns,
Legal, Billing, Team & Access) used by agency staff.

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

All filtering is client-side (`filterJobs()` in `src/hooks/useJobs.ts`) — the
API returns the full dataset and the browser filters it. No server-side
pagination exists anywhere in this app.

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

**Known gap, deliberately deferred**: no row-level scoping exists for `cse`
— a `cse` role sees every company/lead, not just their own assigned
accounts. Would need a `Staff` ↔ `CseRep` link that doesn't exist yet.

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

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) runs
`vercel build --prod && vercel deploy --prebuilt --prod`. PRs get a preview
deployment with the URL commented automatically. `main` has branch
protection requiring the `verify` status check (install → build →
type-check) to pass via a PR — **no direct pushes to `main` are possible**,
even for docs-only changes; a direct `git push` attempt is rejected outright
by GitHub (`GH006: Protected branch update failed`), not just discouraged by
convention.

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

As of this document, migrations run through `0010` (see `MIGRATIONS.md` for
the full per-file breakdown). *(Note: this reflects the repo's state as of
Phase 8's completion — migration `0010` landed mid-Phase-8 as a code-review
fix-forward, after the Phase 8 plan doc's Task 5 was written, so that plan's
literal text still says `0009`. This document describes the current,
corrected state on purpose; don't read the discrepancy as an error.)*

## Cron jobs

Vercel's Hobby plan caps this project at **2 cron jobs, once-per-day
minimum interval** — both existing crons are already at that cap:
- `/api/cron/job-alerts` (`0 9 * * *`, daily) — posts new jobs to
  Telegram/Facebook, and since Phase 6/7 also runs `runHealthCheck()` and
  `runCrmDigest()` at the start of the same invocation (piggybacked, not
  separate crons).
- `/api/cron/weekly-email` (`0 9 * * 1`, Mondays) — weekly digest email.

Both are authenticated via `CRON_SECRET` (see above). If you ever see a
cron behaving unexpectedly, check Vercel's dashboard → project → **Cron
Jobs** tab for real invocation history and per-run status — that view is
not exposed through the Vercel CLI or public API, only the dashboard UI.

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
- **Open question, not yet resolved**: during Phase 7 follow-up work,
  `system_events` was found completely empty (zero rows of any kind,
  including basic cron-success heartbeats) at a point where it should have
  had rows from Phase 5/6 having been live for some time. A `CRON_SECRET`
  misconfiguration was investigated and fixed as part of that session, but
  it was never conclusively confirmed whether that was the actual root
  cause of the empty table, or a coincidence — the empty/falsy secret state
  found at the time would have *disabled* the auth check rather than
  blocked requests, which doesn't fully explain a total absence of rows.
  Worth checking `system_events` again post-handover to confirm it's
  populating normally.
- Sentry alert rules (e.g. paging on spike thresholds) are configured in
  the Sentry dashboard itself, not in this codebase — nothing here manages
  that config.

## Where to find more history

- `PROGRESS.md` — phase-by-phase changelog, most detailed operational log,
  including exact commit hashes and what code review caught at each step.
- `docs/superpowers/specs/*.md` — one design spec per phase, each with an
  explicit Goals/Non-goals section.
- `docs/superpowers/plans/*.md` — one implementation plan per phase, with
  exact code diffs for every change made.
