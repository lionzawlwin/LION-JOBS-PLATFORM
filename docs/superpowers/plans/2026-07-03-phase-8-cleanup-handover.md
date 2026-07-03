# Phase 8: Final Performance Optimization & CTO Handover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No test suite exists in this repo.** Every task's steps are **Implement → Type-check/Lint → Commit**, matching Phases 4-7.

**Goal:** Fix a genuinely broken `npm run lint`, remove a stale git worktree, delete 6 leftover debug `console.log` sites, add missing indexes on `system_events`, and write a `CTO_HANDOVER.md` for a human successor — per `docs/superpowers/specs/2026-07-03-phase-8-cleanup-handover-design.md`.

**Architecture:** Six independent, narrowly-scoped tasks. No new runtime code paths — this phase touches config, local git state, log statements, one additive migration, and one new doc file.

**Tech Stack:** ESLint flat config, git worktrees, Supabase (existing migration process).

---

## Correction to the approved spec

The spec said "5 `console.log` call sites... `apply/route.ts` (3)". Re-reading the file for this plan found **4** sites in `apply/route.ts` (lines 98, 128, 133, 197), not 3 — total is **6**, not 5. This doesn't change scope or approach, just the accurate count; noted here so the discrepancy isn't silently absorbed.

---

## File Structure

**Create:**
- `supabase/migrations/0009_add_system_events_indexes.sql`
- `CTO_HANDOVER.md` (repo root)

**Modify:**
- `eslint.config.mjs` — root-anchor the ignore patterns
- `src/app/api/apply/route.ts` — remove 4 `console.log` lines
- `src/app/api/webhooks/publish-job/route.ts` — remove 1 `console.log`, invert the now-empty `if` block
- `src/app/api/email/send/route.ts` — remove 1 `console.log` line
- `supabase/MIGRATIONS.md` — add the `0009` row
- `PROGRESS.md` — Phase 8 section

**Remove (local, not a git change):**
- `.claude/worktrees/b2b-enterprise-crm` git worktree directory

---

### Task 1: Fix `eslint.config.mjs`'s ignore patterns

**Files:**
- Modify: `eslint.config.mjs`

- [ ] **Step 1:** Current content:
```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

Replace with:
```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next. Rooted with a leading `**/` so
    // nested occurrences (e.g. inside a git worktree under
    // .claude/worktrees/) are excluded too, not just a top-level directory
    // next to this config file — an unrooted ".next/**" previously let
    // `npm run lint` crawl into a worktree's compiled build output and
    // crash with an out-of-memory error.
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

- [ ] **Step 2:** Run `npm run lint`. Expected: completes (does not crash with an
  OOM error). It may report real lint findings from the rest of the
  codebase — that's fine and out of scope for this task; the bar here is
  "the command finishes running," not "zero findings."

- [ ] **Step 3:** Commit:
```bash
git add eslint.config.mjs
git commit -m "fix(lint): root-anchor eslint ignore patterns to exclude nested build dirs"
```

---

### Task 2: Remove the stale `b2b-enterprise-crm` worktree

**Files:** none (local git state only, not tracked/committed)

- [ ] **Step 1:** Confirm the worktree's branch is fully merged before removing anything:
```bash
git merge-base --is-ancestor worktree-b2b-enterprise-crm main && echo MERGED || echo NOT-MERGED
```
Expected: `MERGED`. **Do not proceed to Step 2 if this prints `NOT-MERGED`** — stop and report back instead of removing a worktree with unmerged work.

- [ ] **Step 2:** Remove the worktree:
```bash
git worktree remove .claude/worktrees/b2b-enterprise-crm
```

- [ ] **Step 3:** Verify:
```bash
git worktree list
```
Expected: only the main working directory is listed, no `b2b-enterprise-crm` entry.

- [ ] **Step 4:** Confirm nothing else changed:
```bash
git status
```
Expected: clean (this task has no files to commit — the worktree was excluded
via `.git/info/exclude`, not tracked, so there's nothing to `git add`).

---

### Task 3: Remove the 6 leftover `console.log` debug sites

**Files:**
- Modify: `src/app/api/apply/route.ts`
- Modify: `src/app/api/webhooks/publish-job/route.ts`
- Modify: `src/app/api/email/send/route.ts`

- [ ] **Step 1:** In `src/app/api/apply/route.ts`, remove this line (currently line 98):
```ts
    console.log(`[apply] Candidate "${fullName}" saved to database.`);
```
So this:
```ts
    });
    console.log(`[apply] Candidate "${fullName}" saved to database.`);
  } catch (err) {
```
becomes:
```ts
    });
  } catch (err) {
```

- [ ] **Step 2:** In the same file, remove this line (currently line 128, plus
  the blank line before it so two consecutive statements aren't left with an
  orphaned blank line before a comment):
```ts
        console.log(`[apply] CV uploaded to Drive for "${fullName}": ${driveUrl}`);
```
So this:
```ts
        const driveUrl = await uploadFileToDrive(
          { name: cvFileName, base64: cvBase64 },
          folderId,
        );

        console.log(`[apply] CV uploaded to Drive for "${fullName}": ${driveUrl}`);

        // c. Write the Drive URL back into the application record
        if (applicationId) {
```
becomes:
```ts
        const driveUrl = await uploadFileToDrive(
          { name: cvFileName, base64: cvBase64 },
          folderId,
        );

        // c. Write the Drive URL back into the application record
        if (applicationId) {
```

- [ ] **Step 3:** In the same file, remove this line (currently line 133):
```ts
          console.log(`[apply] cv_url updated in database for application ${applicationId}`);
```
So this:
```ts
        if (applicationId) {
          await updateCandidateCvUrl(applicationId, driveUrl);
          console.log(`[apply] cv_url updated in database for application ${applicationId}`);
        }
```
becomes:
```ts
        if (applicationId) {
          await updateCandidateCvUrl(applicationId, driveUrl);
        }
```

- [ ] **Step 4:** In the same file, remove this line (currently line 197):
```ts
          console.log(`[apply] AI score ${result.score}/100 saved for application ${applicationId}`);
```
So this:
```ts
        if (result) {
          await saveAiScore(applicationId, result.score, result.summary, result.reasoning);
          console.log(`[apply] AI score ${result.score}/100 saved for application ${applicationId}`);
        }
```
becomes:
```ts
        if (result) {
          await saveAiScore(applicationId, result.score, result.summary, result.reasoning);
        }
```

- [ ] **Step 5:** In `src/app/api/webhooks/publish-job/route.ts`, removing the
  `console.log` on the success branch leaves an empty `if` block, which is
  worse than the original — invert the condition instead so there's no empty
  block. Replace:
```ts
  if (res.ok) {
    console.log('[publish-job] GitHub Actions dispatch sent successfully');
  } else {
    await logFailure({
      category: 'webhook',
      route:    '/api/webhooks/publish-job',
      message:  `GitHub Actions dispatch failed: ${res.status}`,
      context:  { status: res.status },
    });
  }
```
with:
```ts
  if (!res.ok) {
    await logFailure({
      category: 'webhook',
      route:    '/api/webhooks/publish-job',
      message:  `GitHub Actions dispatch failed: ${res.status}`,
      context:  { status: res.status },
    });
  }
```

- [ ] **Step 6:** In `src/app/api/email/send/route.ts`, remove this line
  (currently line 104):
```ts
    console.log(`[email] Sent ${type} to ${to}:`, result);
```
So this:
```ts
    const result = await resend.emails.send({
      from:    FROM,
      to:      Array.isArray(to) ? to : [to],
      subject: email.subject,
      html:    email.html,
    });
    console.log(`[email] Sent ${type} to ${to}:`, result);
    return Response.json({ ok: true, id: result.data?.id });
```
becomes:
```ts
    const result = await resend.emails.send({
      from:    FROM,
      to:      Array.isArray(to) ? to : [to],
      subject: email.subject,
      html:    email.html,
    });
    return Response.json({ ok: true, id: result.data?.id });
```

- [ ] **Step 7:** Run `npx tsc --noEmit` — expect no errors.

- [ ] **Step 8:** Verify the count dropped to zero:
```bash
grep -rn "console\.log" src/ | wc -l
```
Expected: `0`. (This intentionally does not match `console.error`/`console.warn` —
those are a separate, deliberate, pre-existing pattern in `src/lib/db/*.ts`
and `src/app/api/webhooks/publish-job/route.ts`'s missing-env-var warning,
untouched by this task.)

- [ ] **Step 9:** Commit:
```bash
git add src/app/api/apply/route.ts src/app/api/webhooks/publish-job/route.ts src/app/api/email/send/route.ts
git commit -m "chore: remove leftover debug console.log calls (pre-Phase-5 logging)"
```

---

### Task 4: Index `system_events` on its actual query columns

**Files:**
- Create: `supabase/migrations/0009_add_system_events_indexes.sql`
- Modify: `supabase/MIGRATIONS.md`

- [ ] **Step 1:** Create `supabase/migrations/0009_add_system_events_indexes.sql`:
```sql
-- Phase 8: system_events (added in 0007) had zero indexes beyond its
-- primary key, despite being queried by category/route/level and a
-- created_at range/order on every System Health dashboard load
-- (listSystemEvents) and on every single cron invocation
-- (getCronStatus() runs one category+route+created_at query per cron
-- route, every day, from both job-alerts and weekly-email).
CREATE INDEX IF NOT EXISTS idx_system_events_category_route_created_at
  ON system_events (category, route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at
  ON system_events (created_at DESC);
```

- [ ] **Step 2:** Run `npx supabase migration list` first — confirm local/remote
  agree through `0008`. Then run `npx supabase db push`. Expected: confirms
  `0009_add_system_events_indexes.sql` applied.

- [ ] **Step 3:** Verify: run `npx supabase migration list` again — confirm
  local/remote now agree through `0009`.

- [ ] **Step 4:** Update `supabase/MIGRATIONS.md` — add a row to the numbering
  table:
```markdown
| `0009_add_system_events_indexes.sql` | 2026-07-03 | Indexes on `system_events` for category/route/created_at (Phase 8 perf) |
```
And update the "next migration is" line to say `0010`.

- [ ] **Step 5:** Commit:
```bash
git add supabase/migrations/0009_add_system_events_indexes.sql supabase/MIGRATIONS.md
git commit -m "feat(db): index system_events on category/route/created_at for Phase 8"
```

---

### Task 5: Write `CTO_HANDOVER.md`

**Files:**
- Create: `CTO_HANDOVER.md` (repo root)

- [ ] **Step 1:** Create `CTO_HANDOVER.md` with this exact content:

```markdown
# CTO Handover — Lion Jobs Agency Platform

This document is written for a human successor, not an AI agent — for
agent-facing operating instructions see `CLAUDE.md`. It synthesizes
`CLAUDE.md`, `PROGRESS.md`, and eight phases of design specs under
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
- Resend — transactional email, weekly digest, and both Phase 6/7/8 alert
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
Post Job/Team. Role changes take effect on the staff member's **next
login**, not immediately (it's baked into the JWT at sign-in).

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
even for docs-only changes; this was confirmed the hard way during Phase 7's
follow-up work when a direct push attempt was rejected by GitHub.

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

As of this document, migrations run through `0009` (see `MIGRATIONS.md` for
the full per-file breakdown).

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
  As of Phase 8 it's indexed on `(category, route, created_at)` and
  `(created_at)` — see `supabase/migrations/0009`.
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
```

- [ ] **Step 2:** Commit:
```bash
git add CTO_HANDOVER.md
git commit -m "docs: add CTO_HANDOVER.md synthesizing CLAUDE.md/PROGRESS.md/specs for a human successor"
```

---

### Task 6: Final verification, PROGRESS.md, push

**Files:** none new — verification + `PROGRESS.md`

- [ ] **Step 1:** Run `npx tsc --noEmit` — expect clean.

- [ ] **Step 2:** Run `npm run lint` — expect it to complete without crashing
  (this is the regression test for Task 1).

- [ ] **Step 3:** Confirm no new Vercel cron: `git diff main -- vercel.json` —
  expect empty.

- [ ] **Step 4:** Confirm the migration applied: `npx supabase migration list`
  — local/remote agree through `0009`.

- [ ] **Step 5:** Confirm the worktree is gone: `git worktree list` — only the
  main working directory listed.

- [ ] **Step 6:** Update `PROGRESS.md` — append below the Phase 7 section
  (after its final log line):
```markdown

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
| 4 | Index system_events (migration 0009) | ✅ Done |
| 5 | Write CTO_HANDOVER.md | ✅ Done |
| 6 | Final verification | ✅ Done |

## Log

- 2026-07-03: `npm run lint` was found completely broken (OOM crash) while
  drafting this phase's spec — it was crawling into a stale git worktree's
  (`.claude/worktrees/b2b-enterprise-crm`) compiled `.next` build output
  because the ESLint ignore pattern wasn't rooted (`.next/**` vs
  `**/.next/**`). Fixed by rooting all three ignore patterns.
- 2026-07-03: Confirmed `worktree-b2b-enterprise-crm`'s tip commit was
  already an ancestor of `main` before removing the worktree — it was the
  Billing & Invoicing subsystem's working tree, fully landed.
- 2026-07-03: The approved spec said 5 `console.log` sites (3 in
  `apply/route.ts`); re-reading the file for the plan found 4, for a true
  total of 6. Corrected in the plan; noted here rather than silently
  absorbed.
- 2026-07-03: `system_events` (Phase 5) had zero indexes beyond its primary
  key despite being queried on every dashboard load and every cron
  invocation. Added `(category, route, created_at DESC)` and
  `(created_at DESC)` covering both `getCronStatus()`'s and
  `listSystemEvents()`'s exact query shapes.
- 2026-07-03: `CTO_HANDOVER.md` written as a synthesis for a human
  successor (distinct audience from `CLAUDE.md`'s AI-agent instructions),
  including the still-open `system_events`-empty-table question from
  Phase 7's follow-up investigation as an explicit unresolved item rather
  than glossing over it.
- 2026-07-03: Explicitly out of scope, per the approved spec: broader
  unused-file/dead-export audits, per-role RBAC row-level scoping, Sentry
  alert-rule configuration, re-investigating the `system_events` question.
- 2026-07-03: Cannot verify the new indexes' actual query-latency impact
  from this environment (no access to Supabase's query planner or
  production query volume) — this is a coverage/correctness addition
  justified by the query shapes already in the code, not a benchmarked
  performance claim.
```

- [ ] **Step 7:** Commit:
```bash
git add PROGRESS.md
git commit -m "docs: record Phase 8 cleanup/handover completion in PROGRESS.md"
```

- [ ] **Step 8:** Push the branch:
```bash
git push -u origin feat/phase-8-cleanup-handover
```

Open a PR. **Do not merge it** — wait for the repo owner to review, same as
every prior phase.

---

## Self-Review Notes

**Spec coverage:** all 5 goals (lint fix = Task 1, worktree removal = Task 2,
console.log cleanup = Task 3, indexing migration = Task 4, handover doc =
Task 5) are reflected, plus the spec's non-goals (no speculative deletions,
no schema changes beyond the additive index migration, no branch-ref
deletion, no local-branch pruning) are respected — nothing in this plan does
anything the spec's non-goals list excludes.

**Placeholder scan:** every code step shows exact before/after content. The
`CTO_HANDOVER.md` content in Task 5 is the complete file, not a summary of
what it should contain.

**Type consistency:** no new functions/types introduced by this phase — it's
config, log-statement removal, one SQL migration, and one doc file. Nothing
to drift.
