# Phase 5: Sentry Integration + System Health Dashboard — Design Spec

## Context

No error/logging infrastructure exists in this codebase today beyond ad hoc
`console.error`/`console.log` calls at 21 file, 27 call sites, with no
consistent shape and no persistence beyond Vercel's ephemeral function logs.
Two cron routes (`job-alerts`, `weekly-email`) and the AI CV-scoring route
(`analyze-cv`) have gaps beyond that — see "Current state" below. Sentry is
not installed or configured anywhere (confirmed via repo-wide search: no
package.json entry, no env var, no config file).

Phase 5 adds real exception capture (Sentry) and a native in-app "System
Health" dashboard tab, gated to Owner/Admin only, consuming Phase 4's
`requireTabAccess()` for that gate — Phase 4's enforcement code itself is
not modified.

## Current state (verified, not assumed)

- `cron/job-alerts`: **zero error handling** — an unhandled throw 500s with
  no record of any kind.
- `cron/weekly-email`: per-recipient failures are caught and collected into
  an array, but only `console.log`'d (not even `console.error`) as a
  summary; the outer function has no top-level try/catch.
- `webhooks/publish-job`: the GitHub Actions dispatch is fire-and-forget
  with a bare `console.error` template string, no structured context.
- `analyze-cv` (AI CV scoring): per-candidate failures are collected into an
  `errors` array and returned in the JSON response, but **never logged
  anywhere** — the only visibility today is an admin reading the raw
  response of a POST they triggered.
- `invoices/*`: has the best-shaped handling of the existing 21 files
  (`console.error('[invoices/post]', err)`), but still unstructured and
  unpersisted.
- **`PATCH /api/candidates/[id]/stage` has no auth check at all** — not a
  Phase 4 migration gap (it never had `requireStaff()` to begin with), just
  discovered while reading this file for its (also-unrelated) console.error
  call site. This lets an unauthenticated caller change any candidate's
  pipeline stage. Fixed in this pass by adding
  `requireTabAccess('candidates', 'manage')`, the same domain/level every
  other candidate-mutating route already uses — flagged here explicitly
  since it's a Phase-4-shaped fix landing in a Phase 5 branch, not a new
  Phase 5 feature.

## Goals

- Every route that currently has a handled-but-only-console-logged failure
  gets a structured `Sentry.captureException()` call with safe context.
- Truly unhandled exceptions (nothing in this codebase's control) are
  captured automatically via Next.js's `onRequestError` instrumentation
  hook — no per-route code needed for that class of error.
- A new "System Health" dashboard tab shows the last 50–100 failures
  (grouped by category, with timestamp/route/message) and cron run history
  (last run time + success/fail) for `job-alerts` and `weekly-email`,
  without depending on Sentry's API being reachable at dashboard-load time.

## Non-goals (explicit, per your own instructions)

- Alerting/notifications (Phase 6, separate).
- Any change to Phase 4's `requireTabAccess()`/`hasAccess()` enforcement
  code — a new `TabDomain` value is added to the data (`permissions.ts`'s
  matrix), which is how every prior Phase 4 domain was added; the mechanism
  itself is untouched.
- Sentry performance tracing, session replay, or source-map upload (the
  latter needs a separate `SENTRY_AUTH_TOKEN` + org/project slugs that
  weren't requested and aren't needed for exception capture to work).
- Refactoring any file beyond swapping its existing `console.error` call
  (or, for the three files that have none today, adding the missing
  handling) for the new `logFailure()` call.

## Architecture

### 1. `src/instrumentation.ts` (new)

Per Next.js 16's documented instrumentation contract (`register()` +
`onRequestError()`, stable since v15 — confirmed against
`node_modules/next/dist/docs/.../instrumentation.md` before designing this,
per this repo's own CLAUDE.md instruction not to assume Next.js behavior
from training data):

```ts
import * as Sentry from '@sentry/nextjs';

export function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
```

`Sentry.captureRequestError` is `@sentry/nextjs`'s built-in adapter for this
exact hook — it forwards `error`/`request`/`context` to Sentry without us
hand-writing the mapping, and (per Sentry's own SDK behavior) does not
forward raw request headers. If `SENTRY_DSN` is unset, `Sentry.init` is a
no-op and every `Sentry.*` call downstream becomes a safe no-op too —
matching this codebase's existing pattern for optional integrations
(`RESEND_API_KEY`, `GOOGLE_PRIVATE_KEY`, etc. all degrade gracefully when
unset, per `sheets.ts`'s original `isConfigured()` pattern carried forward).

### 2. `src/lib/observability.ts` (new)

```ts
export type FailureCategory = 'webhook' | 'ai_scoring' | 'invoicing' | 'cron' | 'other';

export async function logFailure(input: {
  category: FailureCategory;
  route:    string;
  message:  string;
  error?:   unknown;
  context?: Record<string, string | number | boolean | null>;
}): Promise<void>
```

Called at every existing `console.error` site (21 files) plus the 3 gaps
identified above (the 2 cron routes, `analyze-cv`). Does two things:

1. `Sentry.captureException(error, { tags: { category, route }, extra: context })`
2. Inserts one row into the new `system_events` table (below)

Both are independent and best-effort — a Sentry send failure must never
block the row insert or vice versa, and neither may throw back into the
calling route (this function's whole job is to make failure-reporting
itself failure-proof).

**Hard rule, enforced by convention at every call site, not by this
function:** `context` may only contain non-PII fields — IDs, HTTP status
codes, counts, boolean flags. Never a candidate's name/email/phone/CV URL,
never a raw request body, never any header value. This mirrors the same
rule Phase 4 already applies to route-guard context and the design spec's
own non-goals list.

### 3. `supabase/migrations/0007_add_system_events.sql` (new)

```sql
CREATE TABLE IF NOT EXISTS system_events (
  id         TEXT PRIMARY KEY,
  category   TEXT NOT NULL CHECK (category IN ('webhook', 'ai_scoring', 'invoicing', 'cron', 'other')),
  level      TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'info')),
  route      TEXT NOT NULL,
  message    TEXT NOT NULL,
  context    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
```

RLS enabled with no policies — matches every other table's model (only the
service-role key touches it, server-side only, per `MIGRATIONS.md`'s
explicit lesson-learned rule to never skip this on a new table again).

Cron routes (`job-alerts`, `weekly-email`) write a row on **every**
invocation, not just failures (`level: 'info'` on success) — that's what
makes "last run time, success/fail" queryable at all. Every other call site
only writes on failure (`level: 'error'`, the column default).

### 4. Dashboard: System Health tab

- `src/lib/permissions.ts`: `TabDomain` gains `'system-health'`. Matrix row
  mirrors `team` exactly — `owner: 'manage', admin: 'manage', cse: 'none',
  viewer: 'none'`. This is additive data, not a change to `hasAccess()`/
  `getAccessLevel()` themselves.
- `GET /api/system-events` (new route): `requireTabAccess('system-health',
  'view')`. Query params `category` (optional, one of the 5 enum values)
  and `days` (optional, default 7). Returns `{ events: SystemEvent[],
  cronStatus: { route: string; lastRunAt: string; ok: boolean; message:
  string }[] }` — `events` capped at 100, most recent first; `cronStatus`
  is the single most recent row per distinct cron route regardless of
  `level`.
- `src/components/dashboard/SystemHealthView.tsx` (new) + `src/hooks/
  useSystemEvents.ts` (new, SWR) — same shape as `BillingView.tsx`/
  `useInvoices`. Category filter (select) + date-range filter (the `days`
  param), a cron-status summary row, and a table of recent failures.
- `src/components/dashboard/DashboardClient.tsx`: add `'system-health'` to
  `ALL_TABS` (icon, label) and its content-render block — same additive
  pattern as every prior tab (Billing, Legal, Team).
- i18n keys added for `en`/`my` (tab label + banner text), matching the
  fully-localized-dashboard precedent already established.

## Route → category mapping

| Category | Routes |
|---|---|
| `cron` | `cron/job-alerts`, `cron/weekly-email` (both currently have gaps — see "Current state") |
| `webhook` | `webhooks/publish-job` |
| `ai_scoring` | `analyze-cv` (currently logs nothing) |
| `invoicing` | `invoices/route.ts`, `invoices/[id]/route.ts`, `candidates/[id]/final-salary` |
| `other` | every other file in the 21-file `console.error` list: `apply`, `candidates/[id]/consent`, `candidates/[id]/cv-url`, `candidates/[id]/interview`, `candidates/[id]/job`, `candidates/[id]/route`, `candidates/[id]/stage` (also gets the auth fix), `candidates/route`, `download`, `email/send`, `employers/request`, `jobs/[id]`, `jobs/route`, `leads/[id]`, `leads/[id]/status`, `legal/settings`, `subscribe` |

`apply`, `subscribe`, and `employers/request` are legitimately public,
rate-limited routes (verified by reading each) — they keep their existing
no-auth design; only their `console.error` calls become `logFailure` calls
(category `other`), nothing about their access control changes.

## Testing / verification

- `npx tsc --noEmit` after each task.
- Manual click-through of the System Health tab cannot be performed in this
  environment (OAuth-gated dashboard, same limitation as every prior
  phase) — recommend spot-checking after merge: trigger a real failure
  (e.g. temporarily misconfigure `RESEND_API_KEY` and run the weekly-email
  cron manually) and confirm it appears both in Sentry and on the System
  Health tab.
- Sentry capture itself can't be verified end-to-end without a live
  `SENTRY_DSN` request actually reaching Sentry's servers from this
  environment — verification here is limited to confirming `Sentry.init`
  is called with the right DSN and `Sentry.captureException`/
  `captureRequestError` are wired at the right call sites; whether events
  actually arrive in the Sentry project is something to confirm from the
  Sentry dashboard after deploy.

## Out of scope (deferred, not forgotten)

- Alerting/notifications (Phase 6)
- Sentry performance tracing, session replay, source-map upload
- A DB-backed retention/pruning policy for `system_events` (the table will
  grow unbounded; the UI only ever shows the last 100, but nothing deletes
  old rows yet — worth a follow-up if this ever matters at this app's
  scale)
