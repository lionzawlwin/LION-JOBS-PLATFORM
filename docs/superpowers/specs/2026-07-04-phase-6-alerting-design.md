# Phase 6: Alerting on Failures — Design Proposal (UNAPPROVED)

> **Status: awaiting your review.** This is a proposal, not an approved
> spec. Per this project's own brainstorming process (and per the
> `docs/superpowers/plans/2026-07-03-phase-5-observability.md` note that
> named this "Phase 6, out of scope" for Phase 5), a design like this
> normally goes through clarifying questions with you before being
> finalized. You were asleep when this was drafted, so the questions below
> are answered with my best judgment and flagged explicitly — please
> correct any of them before I turn this into an implementation plan.
> **No code has been written against this spec. Nothing has been
> implemented.**

## Context

Phase 5 added Sentry capture and a `system_events` Supabase table, but
both are purely passive — a failure is only visible if a human opens the
Sentry dashboard or the System Health tab. Nothing pushes a notification
to anyone when something actually breaks. That gap is "Phase 6" per the
one-line mention that came up during Phase 5's scoping.

## Open questions I answered with my own judgment (please correct these)

1. **Primary channel.** This codebase already has two working outbound
   channels wired up in production: email (`RESEND_API_KEY`/
   `RESEND_FROM_EMAIL`, used for the weekly digest) and Telegram
   (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHANNEL_ID`, used by `cron/job-alerts`
   to post to a channel — though those two vars aren't documented in
   `.env.example`, a small pre-existing gap unrelated to this proposal).
   **My assumption: email is the primary alert channel** (goes to you
   personally, not a channel other people might see), with Telegram as an
   optional secondary if you want something more immediate/visible.
2. **Build vs. configure.** Sentry itself already has mature, built-in
   alerting (email/Slack/etc. on new issues, configurable thresholds,
   deduplication) that you get for free by configuring alert rules in the
   Sentry project dashboard — zero new code. **My recommendation: use
   Sentry's own alert rules as the primary mechanism for "notify me when
   something breaks,"** and scope this phase's actual code to something
   Sentry *can't* do: alerting on patterns specific to this app's own
   `system_events` data that Sentry has no visibility into (see below).
3. **What's actually worth custom-building on top of Sentry's alerts:**
   - **Cron silence detection**: Sentry alerts on errors, but has no
     concept of "this cron job didn't run today at all" (e.g. a Vercel
     cron misconfiguration, not a code exception). `system_events`
     already has exactly the data to detect this (`getCronStatus()`'s
     `lastRunAt` per route) — a daily check that alerts if either cron
     hasn't run in >36 hours (some slack for retry/timezone) is something
     Sentry structurally cannot do, since a cron that never fires never
     throws an exception for Sentry to catch.
   - **Failure-rate spike digest**: a periodic (e.g. hourly) check of
     `system_events` for failure *volume* by category, alerting only on a
     meaningful spike (e.g. >5 failures in an hour in one category) rather
     than one-at-a-time — reduces alert fatigue versus "email me on every
     single failure," which Sentry's default alerting would otherwise do.
4. **Delivery mechanism for the two checks above**: a new Vercel cron
   (matching the existing `job-alerts`/`weekly-email` pattern exactly —
   same `CRON_SECRET` auth, same `vercel.json` cron entry pattern), running
   hourly, that queries `system_events` via the existing `src/lib/db/
   systemEvents.ts` accessor and sends an email via Resend when a
   threshold is crossed. This reuses 100% of existing infrastructure
   patterns — no new integration, no new credential beyond what's already
   configured.

## Explicit non-goals (please confirm these are actually out of scope)

- Slack/Discord/SMS channels — not configured anywhere in this codebase
  today; would need new credentials you'd have to provide.
- Configurable-by-admin alert thresholds (a settings UI) — hardcoded
  thresholds in code, matching this codebase's existing pattern of
  hardcoded config (e.g. Phase 4's permissions matrix) rather than
  building admin UI for every tunable value.
- Alerting on individual `logFailure()` calls one-at-a-time (that's
  Sentry's job, via its own alert rules — configuring those is a Sentry
  dashboard task for you, not a code task for me).
- Any change to Phase 4/5's existing code (`requireTabAccess`,
  `logFailure`, `system_events` schema) — this phase only reads from
  what already exists.

## Proposed architecture (if the above is approved)

- `src/app/api/cron/health-check/route.ts` (new) — Vercel cron, same
  `CRON_SECRET` auth pattern as `job-alerts`/`weekly-email`. Runs hourly.
  Checks: (a) either cron route's `lastRunAt` older than 36h → alert; (b)
  failure count per category in the last hour > threshold (proposed: 5) →
  alert. Sends one summary email via Resend if either condition fires;
  sends nothing if healthy (no "all clear" spam).
- `vercel.json` — add the new cron schedule entry alongside the existing
  two.
- No new database table — reads `system_events` via the existing
  `listSystemEvents`/`getCronStatus` accessors from Phase 5.
- No new dashboard UI — this is a backend-only phase; System Health
  (Phase 5) remains the place to look at history, this just adds a push
  notification on top for the two conditions above.

## What I need from you before this becomes an implementation plan

1. Confirm or correct the primary-channel assumption (email vs. Telegram
   vs. both).
2. Confirm the "configure Sentry's own alerts, custom-build only the
   cron-silence + failure-spike digest" split, or tell me you want
   something broader/narrower.
3. Confirm the thresholds (36h cron silence, 5 failures/hour/category) or
   give me different numbers.
4. Anything from the "explicit non-goals" list you actually do want.

Once you confirm, I'll turn this into a task-by-task implementation plan
and build it the same way as Phase 4/5 — reviewed, on a branch, PR left
for you to merge.
