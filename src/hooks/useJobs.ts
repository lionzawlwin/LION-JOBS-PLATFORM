'use client';

import useSWR from 'swr';
import { useState, useMemo } from 'react';
import type { Job, JobFilters } from '@/types';

const PAGE_SIZE = 30;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildUrl(filters: JobFilters | undefined, offset: number, limit: number): string {
  const p = new URLSearchParams();
  if (filters?.keyword)   p.set('keyword',   filters.keyword);
  if (filters?.category)  p.set('category',  filters.category);
  if (filters?.type)      p.set('type',      filters.type);
  if (filters?.location)  p.set('location',  filters.location);
  if (filters?.salaryMin) p.set('salaryMin', String(filters.salaryMin));
  if (filters?.salaryMax) p.set('salaryMax', String(filters.salaryMax));
  p.set('limit', String(limit));
  p.set('offset', String(offset));
  return `/api/jobs?${p.toString()}`;
}

interface JobsResponse { jobs: Job[]; total: number }

interface UseJobsOptions {
  /** Page size for the "Load More" homepage flow (default 30). Callers
   *  that need the effectively-complete list instead of a paginated view
   *  (JobsPanel's management table, AnalyticsOverview's stats) pass a
   *  generous cap here instead — see getJobsPaginated()'s own 1000-row
   *  ceiling in src/lib/db/jobs.ts. */
  limit?: number;
}

export function useJobs(
  initialJobs?: Job[],
  filters?: JobFilters,
  initialTotal?: number,
  options?: UseJobsOptions,
) {
  const limit = options?.limit ?? PAGE_SIZE;
  const filterKey = JSON.stringify(filters ?? {});
  const url = useMemo(() => buildUrl(filters, 0, limit), [filterKey, limit]);

  const { data, error, isLoading, mutate: rawMutate } = useSWR<JobsResponse>(url, fetcher, {
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
  // Adjusted during render (React's documented pattern for "reset state
  // when a prop changes"), not in an effect — this runs synchronously in
  // the same commit rather than triggering a second render pass.
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey);
    setExtraPages([]);
  }

  const jobs  = useMemo(() => [...(data?.jobs ?? []), ...extraPages], [data, extraPages]);
  const total = data?.total ?? 0;
  const hasMore = jobs.length < total;

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(filters, jobs.length, limit));
      const next: JobsResponse = await res.json();
      setExtraPages((prev) => [...prev, ...next.jobs]);
    } finally {
      setLoadingMore(false);
    }
  }

  // Back-compat wrapper: JobsPanel.tsx does optimistic updates by calling
  // mutate(newJobsArray, false) with a plain Job[], exactly as it did
  // before this hook's underlying SWR cache value became {jobs, total}.
  // Re-wrap here so that existing call site keeps working unchanged.
  function mutate(newJobs?: Job[], shouldRevalidate?: boolean) {
    if (newJobs === undefined) return rawMutate();
    return rawMutate({ jobs: newJobs, total: newJobs.length }, shouldRevalidate);
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
