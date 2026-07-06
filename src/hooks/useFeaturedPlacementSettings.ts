'use client';

import useSWR from 'swr';

interface FeaturedPlacementSettings {
  priceMmk:     number;
  durationDays: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Mirrors useAccountPlans() in usePlanUsage.ts -- same SWR shape, one
// settings object per that hook's array-of-plans.
export function useFeaturedPlacementSettings() {
  const { data, isLoading, mutate } = useSWR<FeaturedPlacementSettings>(
    '/api/featured-placement-settings',
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    settings: data ?? { priceMmk: 0, durationDays: 0 },
    loading:  isLoading,
    mutate,
  };
}
