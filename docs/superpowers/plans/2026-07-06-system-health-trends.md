# System Health Trend Charts Implementation Plan

> **For agentic workers:** Executed inline under broad standing autonomous-execution authorization (2026-07-06, extended to the full remaining roadmap). REQUIRED SUB-SKILL: superpowers:executing-plans conventions.

**Goal:** Extend System Health beyond "last run status" to daily error-count and per-cron uptime history — CEO Roadmap Item #8 (previously "Later" tier, now authorized).

**Architecture:** No new migration or aggregation table. `listSystemEventsForTrend(days)` fetches every `system_events` row (not just `level='error'` like `listSystemEvents()`) in the window, since cron *successes* are logged at `level='info'` by `logCronSuccess()` and are needed for uptime, not just failures. Two pure functions bucket that raw list by day: `computeDailyErrorCounts()` (all-category error count per day) and `computeCronDayStatus()` (per-route ok/fail/none per day). The existing hand-rolled `Sparkline` SVG component (in `TrendChart.tsx`, built for the Overview tab's stats — "this repo has no charting library and one wasn't worth adding") is exported and reused rather than duplicated or replaced with a new charting dependency.

**Design decisions:**
- **No new table** — the raw event stream, bucketed at request time, is enough at this app's current volume (same reasoning as `stats_history`'s existence was for jobs/candidates/companies, but system_events doesn't need its own snapshot table since it's already timestamped per-event).
- **Reuse `Sparkline`**, don't add a charting library — matches this repo's existing documented rationale exactly.
- **Cron uptime as a day-status strip** (ok/fail/none dots), not a line chart — better fit for a 3-state categorical signal than a continuous line.
- **`days` window reused from the existing `/api/system-events` days selector** (1/7/30) rather than a separate control.

**Tech stack:** existing accessor extended, Next.js route handler, existing `Sparkline`, Vitest.

---

### Task 1: `listSystemEventsForTrend()` accessor — **done** (already added to `src/lib/db/systemEvents.ts`)

### Task 2: Pure `computeDailyErrorCounts()` / `computeCronDayStatus()` + tests — **done** (`src/lib/healthTrends.ts` / `.test.ts`)

### Task 3: Export `Sparkline` from `TrendChart.tsx`
**Files:** Modify `src/components/dashboard/TrendChart.tsx` — add `export` to the existing `Sparkline` function, no behavior change.

### Task 4: Extend `/api/system-events` route
**Files:** Modify `src/app/api/system-events/route.ts` — fetch `listSystemEventsForTrend(days)` alongside the existing calls, compute `dailyErrorCounts`/`cronDayStatus`, include in the response.

### Task 5: Extend `SystemHealthView.tsx`
**Files:** Modify `src/components/dashboard/SystemHealthView.tsx` — render a `Sparkline` for daily error counts and a day-status strip per cron route, above the existing "Recent Failures" table.

### Task 6: Verify + ship
- `npx tsc --noEmit`, `npm test`, `npm run lint` (no new errors) — branch, PR, CI, merge.
