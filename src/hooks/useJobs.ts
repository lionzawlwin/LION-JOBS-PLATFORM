'use client';

import useSWR from 'swr';
import type { Job, JobFilters } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useJobs(fallbackData?: Job[]) {
  const { data, error, isLoading, mutate } = useSWR<Job[]>('/api/jobs', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    // Server-pre-fetched jobs show immediately; SWR refreshes silently in background
    fallbackData,
  });

  return {
    jobs: data ?? fallbackData ?? [],
    // Only show loading spinner when there's no data at all (no SSR seed)
    loading: isLoading && !fallbackData,
    error: error ? 'Failed to load jobs. Please try again.' : null,
    mutate,
  };
}

export function filterJobs(jobs: Job[], filters: JobFilters): Job[] {
  const kw = filters.keyword.toLowerCase().trim();

  return jobs.filter((job) => {
    if (kw && !job.title.toLowerCase().includes(kw) &&
        !job.company.toLowerCase().includes(kw) &&
        !job.description.toLowerCase().includes(kw)) return false;

    if (filters.category && job.category !== filters.category) return false;
    if (filters.type && job.type !== filters.type) return false;
    if (filters.location && !job.location.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.salaryMin > 0 && job.salaryMax < filters.salaryMin) return false;
    if (filters.salaryMax > 0 && job.salaryMin > filters.salaryMax) return false;

    return true;
  });
}
