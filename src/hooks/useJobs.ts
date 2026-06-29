'use client';

import useSWR from 'swr';
import { useMemo } from 'react';
import type { Job, JobFilters } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function buildUrl(filters?: JobFilters): string {
  if (!filters) return '/api/jobs';
  const { keyword, category, type, location, salaryMin, salaryMax } = filters;
  if (!keyword && !category && !type && !location && !salaryMin && !salaryMax) return '/api/jobs';

  const p = new URLSearchParams();
  if (keyword)   p.set('keyword',   keyword);
  if (category)  p.set('category',  category);
  if (type)      p.set('type',      type);
  if (location)  p.set('location',  location);
  if (salaryMin) p.set('salaryMin', String(salaryMin));
  if (salaryMax) p.set('salaryMax', String(salaryMax));
  return `/api/jobs?${p.toString()}`;
}

export function useJobs(fallbackData?: Job[], filters?: JobFilters) {
  const url = useMemo(() => buildUrl(filters), [filters]);
  const isUnfiltered = url === '/api/jobs';

  const { data, error, isLoading, mutate } = useSWR<Job[]>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
    // Only seed from SSR data when not filtering (full dataset matches the full cache)
    fallbackData: isUnfiltered ? fallbackData : undefined,
  });

  return {
    jobs: data ?? (isUnfiltered ? fallbackData : []) ?? [],
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
