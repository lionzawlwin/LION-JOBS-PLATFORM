# Phase 6: Alerting on Failures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No test suite exists in this repo.** Every task's steps are **Implement → Type-check → Commit**, matching Phases 4 and 5.

**Goal:** Alert the repo owner by email when either cron job goes silent (>36h since last run) or when one failure category spikes (>15 in the last 24h) — the two failure modes Sentry's own alerting can't see, per `docs/superpowers/specs/2026-07-04-phase-6-alerting-design.md`.

**Architecture:** A new `runHealthCheck()` in `src/lib/healthCheck.ts` runs both checks using Phase 5's existing `getCronStatus()`/`listSystemEvents()` accessors, and sends one summary email via Resend if either trips. It's called once at the end of the existing daily `job-alerts` cron — no new Vercel cron job (this project is on Vercel's Hobby plan: 2-cron/daily-only cap, already at capacity).

**Tech Stack:** Resend (already a dependency, already used in `weekly-email`/`email/send`), Supabase (read-only, via existing Phase 5 accessors), Next.js Route Handler.

---

## File Structure

**Create:**
- `src/lib/healthCheck.ts` — `runHealthCheck()`

**Modify:**
- `src/app/api/cron/job-alerts/route.ts` — call `runHealthCheck()` at the end
- `.env.example`, `CLAUDE.md` — document `ALERT_EMAIL`
- `.env.local` — add `ALERT_EMAIL` (not committed)

---

### Task 1: `ALERT_EMAIL` env var

**Files:**
- Modify: `.env.local` (not committed)
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add to `.env.local`**

Append this line (create the file if needed, don't touch any other line):
```
ALERT_EMAIL=lioncommunicationmyanmar@gmail.com
```
Confirm via `git check-ignore .env.local` that it will NOT be committed before finishing — if it's not gitignored, STOP and report BLOCKED.

- [ ] **Step 2: Add to `.env.example`** (no value — this file is committed)

Add near the other Sentry/Resend rows (not the archived section):
```
ALERT_EMAIL=
```

- [ ] **Step 3: Add a row to `CLAUDE.md`'s Environment variables table**

Immediately after the `SENTRY_DSN` row:
```markdown
| `ALERT_EMAIL` | No | Where Phase 6's health-check alerts (cron silence, failure-rate spikes) are sent. Unset = the check silently no-ops, matching every other optional integration in this repo. |
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit` — expect no errors (this task touches no TypeScript).

- [ ] **Step 5: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "chore: document ALERT_EMAIL for Phase 6 health-check alerting"
```
(Never `git add .env.local`.)

---

### Task 2: `src/lib/healthCheck.ts`

**Files:**
- Create: `src/lib/healthCheck.ts`

- [ ] **Step 1: Write it**

```ts
import { Resend } from 'resend';
import { getCronStatus, listSystemEvents } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import type { FailureCategory } from '@/types';

const CRON_SILENCE_HOURS = 36;
const FAILURE_SPIKE_THRESHOLD = 15;
const ROUTE = '/api/cron/job-alerts#health-check';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';

async function checkCronSilence(): Promise<string[]> {
  const statuses = await getCronStatus();
  const problems: string[] = [];
  const knownRoutes = ['/api/cron/job-alerts', '/api/cron/weekly-email'];

  for (const route of knownRoutes) {
    const status = statuses.find((s) => s.route === route);
    if (!status) {
      problems.push(`${route}: has never recorded a run`);
      continue;
    }
    const ageHours = (Date.now() - new Date(status.lastRunAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > CRON_SILENCE_HOURS) {
      problems.push(`${route}: last ran ${ageHours.toFixed(1)}h ago (threshold ${CRON_SILENCE_HOURS}h)`);
    }
  }
  return problems;
}

async function checkFailureSpikes(): Promise<string[]> {
  const events = await listSystemEvents({ days: 1 });
  const counts = new Map<FailureCategory, number>();
  for (const ev of events) {
    counts.set(ev.category, (counts.get(ev.category) ?? 0) + 1);
  }

  const problems: string[] = [];
  for (const [category, count] of counts.entries()) {
    if (count > FAILURE_SPIKE_THRESHOLD) {
      problems.push(`${category}: ${count} failures in the last 24h (threshold ${FAILURE_SPIKE_THRESHOLD})`);
    }
  }
  return problems;
}

// Called once at the end of the daily job-alerts cron (this project's
// Vercel plan caps crons at 2, daily-only, so this piggybacks rather than
// adding a 3rd). Never throws — a health-check failure must not break the
// cron it's riding on.
export async function runHealthCheck(): Promise<void> {
  try {
    const [silenceProblems, spikeProblems] = await Promise.all([
      checkCronSilence(),
      checkFailureSpikes(),
    ]);

    const problems = [...silenceProblems, ...spikeProblems];
    if (problems.length === 0) return;

    const alertEmail = process.env.ALERT_EMAIL;
    const resend = getResend();
    if (!alertEmail || !resend) return;

    await resend.emails.send({
      from:    FROM,
      to:      [alertEmail],
      subject: `Lion Jobs Agency — ${problems.length} health check alert(s)`,
      html:    `<div style="font-family:Arial,Helvetica,sans-serif;padding:24px;">
  <h2>System Health Alert</h2>
  <ul>${problems.map((p) => `<li>${p}</li>`).join('')}</ul>
  <p style="color:#888;font-size:12px;">Check the System Health dashboard tab for details.</p>
</div>`,
    });
  } catch (err) {
    await logFailure({
      category: 'cron',
      route:    ROUTE,
      message:  'Health check itself failed',
      error:    err,
    });
  }
}
```

Note: `checkCronSilence`/`checkFailureSpikes` are plain functions (not exported) — `runHealthCheck` is the only public surface, keeping this file's responsibility single and clear (decide whether to alert, and send the alert), matching the file-structure guidance to keep units small and focused.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/healthCheck.ts
git commit -m "feat(observability): add runHealthCheck() for cron-silence and failure-spike alerts"
```

---

### Task 3: Wire into `job-alerts` cron

**Files:**
- Modify: `src/app/api/cron/job-alerts/route.ts`

- [ ] **Step 1: Read the current file first** (it was rewritten in Phase 5 — Task 7 of `docs/superpowers/plans/2026-07-03-phase-5-observability.md` — to confirm its exact current shape before editing).

Add the import:
```ts
import { runHealthCheck } from '@/lib/healthCheck';
```

At the very end of the `GET` function, right before its final closing brace (i.e., after every existing `return` in the function has already happened for a given request — this needs to run unconditionally as the LAST thing before any of the function's return statements fire, so add it as the first statement inside the `try` block, before the existing `const jobs = await getJobs();` line, so it runs on every invocation regardless of which early-return path the rest of the function takes):

```ts
export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runHealthCheck();

    const jobs = await getJobs();
    // ...rest of the function is completely unchanged from here down
```

This ordering means the health check runs before the job-alerts logic itself, so it can't be skipped by any of job-alerts' own early returns (no-new-jobs, Telegram-not-configured, etc.) — it always runs exactly once per invocation of this cron, which is the whole point of piggybacking here.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/job-alerts
git commit -m "feat(cron): run health check at the start of the daily job-alerts cron"
```

---

### Task 4: Final verification, PROGRESS.md, push

**Files:** none new — verification + `PROGRESS.md`

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit` — expect clean.

- [ ] **Step 2: Confirm no new Vercel cron was added**

Run: `git diff main -- vercel.json` — expect **empty** (this phase must not touch `vercel.json`, per the design's Hobby-plan constraint).

- [ ] **Step 3: Confirm `ALERT_EMAIL` documented, not committed with a value**

Run: `git log --all -- .env.local` — expect empty (never tracked). Run: `grep ALERT_EMAIL .env.example CLAUDE.md` — expect both to show the new entries.

- [ ] **Step 4: Update `PROGRESS.md`**

Append a new section below the existing Phase 5 content:

```markdown

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

- 2026-07-04: Original design proposed a new hourly Vercel cron. The repo owner confirmed this project is on Vercel's Hobby (free) plan — capped at 2 cron jobs, once-per-day minimum interval, already at capacity with `job-alerts`/`weekly-email`. Revised before planning: no new cron, `runHealthCheck()` piggybacks on the existing daily `job-alerts` invocation instead, and the failure-spike window widened from 1h to 24h with the threshold recalibrated accordingly (5/hour → 15/day, same intent).
- 2026-07-04: Two checks only — cron silence (either cron's last run >36h old, via Phase 5's `getCronStatus()`) and failure-rate spikes (>15 failures/24h in one category, via Phase 5's `listSystemEvents()`). Both are things Sentry's own alerting structurally can't do (a cron that never fires throws no exception for Sentry to catch); Sentry's native alert rules remain the recommended mechanism for everything else, configured in the Sentry dashboard, not in this codebase.
- 2026-07-04: No new database table, no new dashboard UI, no new Vercel cron — this phase only adds one new file (`healthCheck.ts`) and one new call site in an existing cron route.
- 2026-07-04: Could not verify the alert email actually arrives via Resend from this environment (no outbound network verification available here) — recommend the repo owner trigger a manual test (e.g. temporarily lower `FAILURE_SPIKE_THRESHOLD` or manually insert a test row) after merge to confirm delivery.
```

- [ ] **Step 5: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: record Phase 6 alerting completion in PROGRESS.md"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin feat/phase-6-alerting
```

Report the compare URL back — **do not open or merge the PR**; per the repo owner's explicit instruction, wait for them to review and merge, and do not start Phase 7 until they confirm.

---

## Self-Review Notes

**Spec coverage:** both checks from the approved spec (cron silence, failure-rate spike) are implemented in Task 2; the Hobby-plan revision (no new cron, piggyback on `job-alerts`, 24h window) is reflected in Task 3; the `ALERT_EMAIL` env var from the spec's "delivery mechanism" is Task 1. Explicit non-goals (Slack/Discord/SMS, admin-configurable thresholds, per-failure alerting, changes to Phase 4/5 code) are respected — no task does any of them.

**Type consistency:** `runHealthCheck()` is defined once (Task 2) and called once (Task 3) with no parameters — no signature drift possible. `FailureCategory` is imported, not redefined.

**No placeholders:** every step shows exact code or exact before/after diffs.
