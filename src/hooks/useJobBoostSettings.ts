'use client';

import useSWR from 'swr';

interface JobBoostSettings {
  priceMmk:     number;
  durationDays: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Mirrors useFeaturedPlacementSettings.ts -- same SWR shape, one price
// point over.
export function useJobBoostSettings() {
  const { data, isLoading, mutate } = useSWR<JobBoostSettings>(
    '/api/job-boost-settings',
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    settings: data ?? { priceMmk: 0, durationDays: 0 },
    loading:  isLoading,
    mutate,
  };
}
