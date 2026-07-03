# Phase 7: CRM/Enterprise Alerting — Design Spec

> **Status: approved 2026-07-04.**

## Context

Phases 4-6 built RBAC, observability, and infrastructure alerting for the
job-board/admin side of the app. Nothing alerts on the CRM/Enterprise side
(Companies, Contracts, B2B Leads) — a contract can lapse, an account can go
cold, or a hot lead can sit unanswered, and nothing tells anyone. Phase 7
closes that gap with a daily digest email covering four specific,
business-relevant conditions.

## Goals

- One daily email to the repo owner (`ALERT_EMAIL`, reused from Phase 6)
  listing every currently-true instance of:
  1. **Contract expiring soon** — `Active` contract, `endDate` within 30
     days (including already past-due — more urgent, not less).
  2. **Stale company** — `Active`/`In-Contract` company, no `Interaction`
     logged and `lastContacted` > 30 days ago.
  3. **New B2B lead needs response** — `status === 'New'`, `submittedAt`
     > 24 hours ago.
  4. **Stale lead in pipeline** — status not in `('New', 'Placed',
     'Rejected', 'Closed')`, `status_updated_at` > 14 days ago.
- Company/contract lines are attributed with the assigned CSE's name,
  derived exactly the way `EnterpriseView.tsx` already does it (most
  recent `Active` contract's `cseId` for that company) — not a new lookup
  mechanism, not a new data relationship.
- No email at all if nothing is flagged (no "all clear" spam, matching
  Phase 6's convention).

## Non-goals

- Per-CSE targeted emails (deferred — CseRep.email is optional/often
  blank, and routing logic adds real complexity for a v1).
- Any change to Phase 4-6 code beyond the one-line stamp added to the
  existing `updateB2bLeadStatus()` accessor (see Data model change below).
- New dashboard UI — this is an email digest, not a new tab.
- Configurable thresholds — hardcoded in code, matching every prior
  phase's pattern (Phase 4's permissions matrix, Phase 6's silence/spike
  thresholds).
- A new Vercel cron — piggybacks on the existing daily `job-alerts`
  invocation, same Hobby-plan constraint as Phase 6.
- CSE attribution for B2B leads — leads are pre-conversion and have no
  CSE assignment anywhere in the data model; only company/contract lines
  get a CSE name.

## Data model change

`b2b_leads` has no column tracking when its `status` last changed — only
`submitted_at` (creation time). Trigger 4 ("stale lead in pipeline") needs
that signal to distinguish "hasn't moved in 14 days" from "was submitted
14 days ago but is progressing normally."

`supabase/migrations/0008_add_lead_status_updated_at.sql`:
```sql
ALTER TABLE b2b_leads ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
UPDATE b2b_leads SET status_updated_at = submitted_at WHERE status_updated_at IS NULL;
ALTER TABLE b2b_leads ALTER COLUMN status_updated_at SET DEFAULT now();
ALTER TABLE b2b_leads ALTER COLUMN status_updated_at SET NOT NULL;
```
(Backfills existing rows to their `submitted_at` as the best available
approximation, then makes the column mandatory going forward with a
`now()` default for new inserts.)

`src/lib/db/leads.ts`'s `updateB2bLeadStatus()` gets one additional column
in its update call — `status_updated_at: new Date().toISOString()` — so
every future status change stamps it correctly. This is the only existing
function this phase modifies.

## Architecture

`src/lib/crmAlerts.ts` (new) — `runCrmDigest()`, structured like Phase 6's
`runHealthCheck()`: four independent, unexported check functions (one per
trigger above), each returning `string[]` problem lines, combined into one
HTML email sent via Resend to `ALERT_EMAIL` if the combined list is
non-empty. Wrapped so its own failure can't break the cron it rides on,
and reports itself via `logFailure()` (category `'other'`, since it's not
one of the four existing categories and doesn't warrant a fifth) if it
fails.

Called from `src/app/api/cron/job-alerts/route.ts`, alongside the
existing `await runHealthCheck();` call (both run every day, both cheap
read-only checks plus an occasional email).

CSE attribution: build a `companyId → cseId → cseName` chain in
`runCrmDigest()` exactly like `EnterpriseView.tsx`'s `assignedCseByCompany`
(most recent `Active` contract per company), using the existing
`getContracts()`/`getCseReps()` accessors — no new query shape.

## Testing / verification

- `npx tsc --noEmit` after each task.
- Cannot verify the digest email actually arrives via Resend from this
  environment (no outbound network verification available) — recommend
  the repo owner trigger a manual test after merge (e.g. temporarily set a
  contract's `endDate` within 30 days, or wait for the next `job-alerts`
  run) to confirm delivery and formatting.
- Cannot verify migration `0008`'s backfill produced sensible
  `status_updated_at` values without inspecting live data — recommend
  spot-checking a few existing `b2b_leads` rows post-migration.

## Out of scope (deferred, not forgotten)

- Per-CSE targeted delivery
- Dashboard UI for these alerts
- Configurable thresholds
- Alerting on other CRM entities (e.g. Interactions, CseRep activity)
