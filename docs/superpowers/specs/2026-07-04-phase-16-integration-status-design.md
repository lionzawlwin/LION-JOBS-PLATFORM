# Phase 16: Integration Status Panel — Design Spec

## Context

The original CTO advisory pitch was "a Settings/Integrations tab surfacing
webhook health." Before writing any code, read `SystemHealthView.tsx`
(Phase 5) and found it **already does most of this**: per-cron last-run
status, and a categorized (`webhook`/`ai_scoring`/`invoicing`/`cron`/
`other`), time-range-filterable failure log across every integration
that calls `logFailure()`. Building a second, separate tab would
duplicate this, not add to it, and would confuse two overlapping views
of the same underlying `system_events` data.

**What's actually still missing**: whether an integration is *configured
at all*. `system_events` only records activity that happened — an
integration that's silently unconfigured (a missing env var) never fires
a failure event, it just silently no-ops (this repo's own established
pattern for every optional integration, per `CLAUDE.md`). Finding out
"is `RESEND_API_KEY` actually set in Production" today requires going to
Vercel directly — there's no dashboard visibility into it at all.

## Goals

- Add an "Integration Status" panel to the **existing** System Health
  tab (not a new tab), showing which integrations have their required
  configuration present, without exposing any secret values.
- Reuse `system-health`'s existing `requireTabAccess` gating — same
  audience as the rest of that tab.

## Non-goals

- A new dashboard tab. This is additive to Phase 5's existing one.
- Exposing actual secret values to the client, ever. Boolean
  "configured: true/false" only.
- Duplicating the failure-log/cron-status UI already on this tab.
- Monitoring `MAKE_DRIVE_WEBHOOK_URL`/`MAKE_EMPLOYER_WEBHOOK_URL` — both
  confirmed deleted from Vercel in Phase 9 as genuinely dead code (no
  code path reads them). Nothing to show status for.

## Design

**New `GET /api/integrations-status`** — gated by
`requireTabAccess('system-health', 'view')`, matching this tab's
existing access level. Server-side only checks `!!process.env.X`,
returns:

```ts
interface IntegrationStatus {
  name: string;
  configured: boolean;
  detail: string; // which env var(s), for an admin to know what to set
}
```

for: Google Drive CV storage (`GOOGLE_SERVICE_ACCOUNT_EMAIL` +
`GOOGLE_PRIVATE_KEY` + `GOOGLE_DRIVE_PARENT_FOLDER_ID`, all three
required), Resend email (`RESEND_API_KEY`), Social publish webhook
(`PUBLISH_WEBHOOK_SECRET` + `GITHUB_ACTIONS_TOKEN` + `GITHUB_REPO`),
Sentry (`SENTRY_DSN`, optional — shown as informational, not a
"problem" if absent), Health-check alert email (`ALERT_EMAIL`, optional,
same treatment).

**`SystemHealthView.tsx`** gains a new panel above the existing "Cron Job
Status" section, rendering these as a simple grid of status chips
(configured = green check, unconfigured = amber warning for
required integrations, neutral gray for optional ones that are
unset by design).

## Edge cases

- Optional integrations (Sentry, `ALERT_EMAIL`) showing "not configured"
  is expected/normal, not a problem — must be visually distinct from a
  required integration missing its config (which is a real
  misconfiguration).
- This file (`SystemHealthView.tsx`) was never wired into `i18n` at all
  (confirmed — every string in it is hardcoded English, unlike most of
  the rest of the dashboard). Not fixing that broader gap here — my new
  panel matches the file's own existing hardcoded-English style for
  consistency, rather than introducing inconsistency by translating only
  the new part. Flagging as a good, separate future cleanup.

## Testing

- No new pure logic worth unit-testing (a handful of `!!process.env.X`
  checks). Verify live: the route returns sensible booleans matching
  what's actually configured in this environment's `.env.local`.
