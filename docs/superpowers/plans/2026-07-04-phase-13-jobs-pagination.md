# Phase 13: Jobs Query Pushdown + Pagination Implementation Plan

Per `docs/superpowers/specs/2026-07-04-phase-13-jobs-pagination-design.md`.
Kept concise relative to Phase 10/11's plans since the scope is small and
precisely bounded (2 files' behavior actually changes; everything else is
additive). Same rigor: implement → `tsc` → commit per task, `npm test` +
full lint + live verification at the end.

## Files
- **Create**: nothing
- **Modify**: `src/lib/db/jobs.ts` (add `getJobsPaginated()`, `getJobs()`
  untouched), `src/app/api/jobs/route.ts` (`GET` only — `POST` untouched),
  `src/hooks/useJobs.ts`, `src/components/HomeClient.tsx`,
  `src/components/jobs/JobGrid.tsx`, `src/app/candidate/page.tsx`
- **Untouched**: `getJobs()` itself and all 11 of its other call sites
  (verified by grep before writing the spec)

### Task 1: `getJobsPaginated()` in `src/lib/db/jobs.ts`

Add alongside the existing `getJobs()`, `appendJob()`, `deleteJob()` —
don't touch those three at all:

```ts
export interface GetJobsPaginatedOptions {
  keyword?: string;
  category?: string;
  type?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  limit?: number;
  offset?: number;
}

export async function getJobsPaginated(
  opts: GetJobsPaginatedOptions = {},
): Promise<{ jobs: Job[]; total: number }> {
  const { keyword, category, type, location, salaryMin, salaryMax } = opts;
  const limit  = Math.min(opts.limit ?? 30, 100);
  const offset = Math.max(opts.offset ?? 0, 0);

  try {
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .order('posted_at', { ascending: false });

    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,company.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }
    if (category) query = query.eq('category', category);
    if (type)     query = query.eq('type', type);
    if (location) query = query.ilike('location', `%${location}%`);
    if (salaryMin) query = query.gt('salary_max', 0).gte('salary_max', salaryMin);
    if (salaryMax) query = query.gt('salary_min', 0).lte('salary_min', salaryMax);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[db/jobs] getJobsPaginated error:', error.message);
      return { jobs: [], total: 0 };
    }

    const jobs = (data ?? []).map((row) => ({
      id:           row.id,
      title:        row.title,
      company:      row.company,
      location:     row.location,
      category:     row.category as JobCategory,
      type:         row.type as JobType,
      salaryMin:    row.salary_min,
      salaryMax:    row.salary_max,
      currency:     row.currency,
      description:  row.description,
      requirements: row.requirements ?? [],
      benefits:     row.benefits ?? [],
      postedAt:     row.posted_at,
      isUrgent:     row.is_urgent ?? false,
      isFeatured:   row.is_featured ?? false,
    }));

    return { jobs, total: count ?? jobs.length };
  } catch (err) {
    console.error('[db/jobs] getJobsPaginated error:', err instanceof Error ? err.message : err);
    return { jobs: [], total: 0 };
  }
}
```

Note the row-mapping block is intentionally duplicated from `getJobs()`
rather than extracted into a shared helper in this pass — both functions
stay independently readable and it's a 15-line block; a shared
`mapRowToJob()` is a reasonable follow-up refactor, not required to ship
this correctly.

- [ ] Implement, `npx tsc --noEmit`, commit: `feat(db): add getJobsPaginated() alongside untouched getJobs()`

### Task 2: `GET /api/jobs` — use the new function

Replace the in-memory-filter body with a call to `getJobsPaginated`,
reading the same params plus new `limit`/`offset`:

```ts
export async function GET(req: NextRequest) {
  try {
    const sp        = req.nextUrl.searchParams;
    const keyword   = sp.get('keyword')?.toLowerCase().trim()  ?? '';
    const category  = sp.get('category')?.trim() ?? '';
    const type      = sp.get('type')?.trim()     ?? '';
    const location  = sp.get('location')?.toLowerCase().trim() ?? '';
    const salaryMin = parseInt(sp.get('salaryMin') ?? '0', 10) || 0;
    const salaryMax = parseInt(sp.get('salaryMax') ?? '0', 10) || 0;
    const limit     = parseInt(sp.get('limit')  ?? '30', 10) || 30;
    const offset    = parseInt(sp.get('offset') ?? '0', 10)  || 0;

    const { jobs, total } = await getJobsPaginated({
      keyword, category, type, location, salaryMin, salaryMax, limit, offset,
    });

    return Response.json({ jobs, total }, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/jobs', message: 'Failed to load jobs', error: err });
    return Response.json(
      { error: 'Failed to load jobs. Check server configuration.' },
      { status: 503 },
    );
  }
}
```

Import `getJobsPaginated` alongside the existing `getJobs, appendJob`
import (only if `getJobs` is still used elsewhere in this file — it
isn't, `POST` uses `appendJob` only, so the import becomes
`getJobsPaginated, appendJob`). `POST` handler is completely unchanged.

- [ ] Implement, `npx tsc --noEmit`, commit: `feat(api): switch GET /api/jobs to query-pushdown pagination`

### Task 3: `useJobs.ts` — pagination state, manual page accumulation

Full replacement of the hook (keep `filterJobs()` at the bottom
unchanged):

```ts
'use client';

import useSWR from 'swr';
import { useState, useEffect, useMemo } from 'react';
import type { Job, JobFilters } from '@/types';

const PAGE_SIZE = 30;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildUrl(filters: JobFilters | undefined, offset: number): string {
  const p = new URLSearchParams();
  if (filters?.keyword)   p.set('keyword',   filters.keyword);
  if (filters?.category)  p.set('category',  filters.category);
  if (filters?.type)      p.set('type',      filters.type);
  if (filters?.location)  p.set('location',  filters.location);
  if (filters?.salaryMin) p.set('salaryMin', String(filters.salaryMin));
  if (filters?.salaryMax) p.set('salaryMax', String(filters.salaryMax));
  p.set('limit', String(PAGE_SIZE));
  p.set('offset', String(offset));
  return `/api/jobs?${p.toString()}`;
}

interface JobsResponse { jobs: Job[]; total: number }

export function useJobs(initialJobs?: Job[], filters?: JobFilters, initialTotal?: number) {
  const filterKey = JSON.stringify(filters ?? {});
  const url = useMemo(() => buildUrl(filters, 0), [filterKey]);

  const { data, error, isLoading, mutate } = useSWR<JobsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    fallbackData: initialJobs
      ? { jobs: initialJobs, total: initialTotal ?? initialJobs.length }
      : undefined,
  });

  const [extraPages, setExtraPages] = useState<Job[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  // A new filter invalidates any accumulated extra pages — "page 3" of
  // the previous search is meaningless once the search itself changed.
  useEffect(() => { setExtraPages([]); }, [filterKey]);

  const jobs  = useMemo(() => [...(data?.jobs ?? []), ...extraPages], [data, extraPages]);
  const total = data?.total ?? 0;
  const hasMore = jobs.length < total;

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(filters, jobs.length));
      const next: JobsResponse = await res.json();
      setExtraPages((prev) => [...prev, ...next.jobs]);
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    jobs,
    total,
    hasMore,
    loadingMore,
    loadMore,
    loading: isLoading && !data,
    error: error ? 'Failed to load jobs. Please try again.' : null,
    mutate,
  };
}

// Client-side filter — still used for saved-jobs mode and as a local fallback
export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
  const kw = filters.keyword.toLowerCase().trim();

  return jobs.filter((job) => {
    if (kw && !job.title.toLowerCase().includes(kw) &&
        !job.company.toLowerCase().includes(kw) &&
        !job.description.toLowerCase().includes(kw)) return false;

    if (filters.category && job.category !== filters.category) return false;
    if (filters.type     && job.type     !== filters.type)     return false;
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.salaryMin > 0 && job.salaryMax < filters.salaryMin) return false;
    if (filters.salaryMax > 0 && job.salaryMin > filters.salaryMax) return false;

    return true;
  });
}
```

- [ ] Implement, `npx tsc --noEmit`, commit: `feat(hooks): add pagination state to useJobs()`

### Task 4: `candidate/page.tsx` — use `getJobsPaginated`

Replace `getJobs()` with `getJobsPaginated({ limit: 30 })`, pass both
`initialJobs` and `initialTotal` down:

```tsx
import { getJobsPaginated } from '@/lib/db';
// ...
export default async function CandidatePage() {
  const { jobs: initialJobs, total: initialTotal } = await getJobsPaginated({ limit: 30 });

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HomeClient initialJobs={initialJobs} initialTotal={initialTotal} />
      </main>
      <AdminBar />
      <Footer />
    </div>
  );
}
```

- [ ] Implement, `npx tsc --noEmit`, commit: `feat(routing): candidate page uses paginated job fetch`

### Task 5: `HomeClient.tsx` — thread `initialTotal`, add Load More

`HomeClient` gains an `initialTotal?: number` prop, passes it to
`useJobs()`, and destructures `hasMore`/`loadingMore`/`loadMore` to pass
into `JobGrid`. Saved-jobs mode is unaffected — it still runs
`filterJobs()` over whatever's been loaded into `jobs` so far (correct:
"load more" and "saved jobs" aren't mutually exclusive, a user can load
more pages then toggle to saved-jobs view).

- [ ] Implement, `npx tsc --noEmit`, commit: `feat(homepage): wire Load More into HomeClient`

### Task 6: `JobGrid.tsx` — render the Load More control

Accepts new `hasMore`/`loadingMore`/`onLoadMore` props; renders a
centered button below the grid when `hasMore` is true, matching this
codebase's existing button styling conventions (brand-600 background,
rounded-xl, same pattern as every other primary action button).

- [ ] Implement, `npx tsc --noEmit`, commit: `feat(homepage): render Load More button in JobGrid`

### Task 7: Final verification

- [ ] `npm test` — all existing 36 tests still pass (nothing here is
  covered by unit tests yet — no Supabase mock exists, same gap Phase 10
  already flagged; recommend as a future addition, not blocking this
  phase)
- [ ] `npx tsc --noEmit` — clean
- [ ] `npx eslint` on all 6 changed files — clean
- [ ] Live-verify via the `browse` skill against local dev server:
  `/candidate` loads 30 jobs initially, Load More button appears if
  `total > 30`, clicking it appends more jobs without losing the
  existing ones, changing a filter resets pagination correctly
- [ ] Update `PROGRESS.md`, commit
- [ ] Push branch, open PR — **do not merge** (repo owner reviews in the
  morning)
