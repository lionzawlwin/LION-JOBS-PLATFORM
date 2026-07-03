# Phase 13: Jobs Query Pushdown + Pagination — Design Spec

## Context

`CLAUDE.md` currently claims "All filtering happens client-side inside
`filterJobs()`... the API returns the full dataset and the browser
filters it." **This is stale.** `/api/jobs`'s `GET` handler already
filters by keyword/category/type/location/salary server-side, in memory,
before responding (confirmed by reading `src/app/api/jobs/route.ts`
directly, not assumed from the doc). `filterJobs()` in `useJobs.ts` today
is only actually exercised for the homepage's "saved jobs" mode, which is
inherently client-side (saved-job IDs live in `localStorage`, no backend
concept of a saved-jobs list to query against).

What's actually still true and still a real gap: `getJobs()`
(`src/lib/db/jobs.ts`) unconditionally does `select('*')` with no
`.range()`, no `WHERE` clause pushdown — every request to `/api/jobs`,
filtered or not, fetches the **entire** `jobs` table from Postgres into
Node memory, then filters in JavaScript. Fine at ~500 rows; a real
DB-load and latency problem at 5-10x scale, per the original CTO
assessment (this part of that assessment holds up).

## Goals

- Push keyword/category/type/location/salary filtering down to the
  Supabase query itself (`.eq()`, `.ilike()`, range comparisons), so
  Postgres does the filtering, not a Node process holding the whole table
  in memory.
- Add real limit/offset pagination to `/api/jobs`, `getJobs()`, and
  `useJobs.ts`, so a single request doesn't have to return the entire
  filtered result set.
- Preserve every existing behavior the frontend depends on today:
  `page.tsx`/`candidate/page.tsx`'s SSR `initialJobs` fetch, the
  homepage's live filter/search UX, the "saved jobs" mode.

## Non-goals

- Dashboard data tables (Candidates, Companies, Contracts, etc.) — not
  what `CLAUDE.md`'s claim was about, and a separate, lower-scale concern.
  Not touched by this phase.
- Cursor-based/infinite-scroll pagination — offset-based is sufficient at
  the stated scale (hundreds to low thousands of rows) and much simpler.
- Removing `filterJobs()` — still needed for saved-jobs mode, which can't
  be pushed server-side without a saved-jobs backend (out of scope).
- Changing job data shape, `Job` type, or the `jobs` table schema.

## Critical correction after auditing call sites

`getJobs()` has **12 call sites**, not one. Grepped all of them before
writing any code: 11 (`sitemap.ts`, both cron routes, the publish-job
webhook, `analyze-cv`, `apply/route.ts`, `apply/[jobId]/page.tsx`,
`jobs/[slug]/page.tsx` ×3, `companies/[slug]/page.tsx` ×3) call
`getJobs()` with no arguments and genuinely need the **complete**
unfiltered list — a sitemap missing jobs past page 1, a cron digest that
only scans page 1, or a "find this specific job" lookup that can't see
jobs past page 1 would all be real, silent correctness regressions, not
edge cases. Changing `getJobs()`'s signature/return shape in place would
have broken all 11 of them.

**Revised design: additive, not a breaking change.** `getJobs()` is
**completely untouched**. A new function, `getJobsPaginated(opts)`, is
added alongside it, used only by `/api/jobs/route.ts`'s `GET` handler and
its SSR counterpart in `candidate/page.tsx` — the only two places that
actually serve the public, potentially-large job *listing* to an
end-user's browser. Every other call site keeps calling the original
`getJobs()` and is untouched by this phase.

## Design

### `src/lib/db/jobs.ts` — new `getJobsPaginated()`, `getJobs()` untouched

New function, all options optional, defaults chosen to match today's
`/api/jobs` behavior as closely as possible:

```ts
interface GetJobsPaginatedOptions {
  keyword?: string;
  category?: string;
  type?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  limit?: number;   // default 30
  offset?: number;  // default 0
}

export async function getJobsPaginated(opts: GetJobsPaginatedOptions = {}): Promise<{ jobs: Job[]; total: number }>
```

Returns `{ jobs, total }` — `total` is the filtered count (via Supabase's
`{ count: 'exact' }` option on the same query), needed by the frontend to
know whether a "Load More" button should still show.

Query construction: `.ilike('title', %kw%)` OR'd against
company/description isn't directly expressible as a single Supabase
`.ilike()` — Postgres `OR` across columns needs `.or()`:
```ts
if (keyword) query = query.or(`title.ilike.%${keyword}%,company.ilike.%${keyword}%,description.ilike.%${keyword}%`);
if (category) query = query.eq('category', category);
if (type) query = query.eq('type', type);
if (location) query = query.ilike('location', `%${location}%`);
if (salaryMin) query = query.gte('salary_max', salaryMin).gt('salary_max', 0);
if (salaryMax) query = query.lte('salary_min', salaryMax).gt('salary_min', 0);
query = query.range(offset, offset + limit - 1);
```
(The salary comparisons mirror the existing in-memory logic's exact
semantics — `job.salaryMax < salaryMin` excluded, `job.salaryMin > 0`
required before comparing against `salaryMax` — translated to query
form, not reinvented.)

### `src/app/api/jobs/route.ts` — pass through, drop in-memory filtering

`GET` reads the same query params it already reads today, but passes
them to `getJobsPaginated(opts)` instead of filtering the full result
afterward. Response shape changes from a bare array to `{ jobs, total }`
— a breaking contract change, but its **only** consumer is
`useJobs.ts` (updated in the same phase, see below). `POST` is
completely unchanged.

### `src/hooks/useJobs.ts` — pagination state

`useJobs()` gains `page` in its return value and accepts a `limit`
default; internally tracks `offset = page * limit`, appends
`limit`/`offset` to the built URL, and exposes `total`/`hasMore` so the
UI can show/hide a "Load More" control. `filterJobs()` is untouched
(still used for saved-jobs mode).

### `HomeClient.tsx` / `JobGrid.tsx` — "Load More" control

A "Load More" button appended below the grid, visible when `hasMore` is
true, calling a new `loadMore()` from the hook (bumps `page`, SWR appends
rather than replaces — needs `useSWRInfinite` or manual accumulation;
simplest correct approach: keep `useSWR` per-page and concatenate pages
in a `useMemo` in the hook, avoiding a new dependency).

### SSR `initialJobs` — `candidate/page.tsx`

Switches from `getJobs()` to `getJobsPaginated({ limit: 30 })` for its
SSR fetch, destructuring `{ jobs, total }` and passing both down to
`HomeClient` → `useJobs()` as `initialJobs`/`initialTotal`. This is the
one other call site this phase touches, since it's the SSR counterpart of
the exact same public-listing use case `/api/jobs` serves — every other
call site (sitemap, cron, webhooks, apply flow, individual job/company
pages) keeps calling the untouched `getJobs()`.

## Edge cases

- **Filter changes while paginated**: changing a filter resets to page 1
  — matches user expectation (a new search shouldn't stay on "page 3" of
  the old results).
- **`total` under Supabase's `count: 'exact'`**: this does a real COUNT
  query alongside the data query (two queries, not one) — acceptable at
  this scale; flag as a future optimization (`count: 'planned'` estimate)
  if it ever becomes a bottleneck, not solved here.

## Testing

- Extend Vitest: a pure-function test for the query-building logic (the
  keyword/category/salary condition construction) is not practical to
  unit test without a Supabase mock — this repo doesn't have one yet
  (same gap Phase 10's spec already flagged). Recommend adding a minimal
  `@supabase/supabase-js` mock as a follow-up if this pattern needs to
  repeat for other accessors.
- Manual/live verification: confirm `/api/jobs?limit=5` returns exactly 5
  jobs + a `total` matching the unfiltered count; confirm a filtered
  query's `total` is less than or equal to the unfiltered total; confirm
  the homepage's Load More button appears/disappears correctly.
