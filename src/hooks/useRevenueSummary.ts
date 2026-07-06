'use client';

import useSWR from 'swr';
import type { RevenueSummary } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRevenueSummary() {
  const { data, isLoading, mutate } = useSWR<RevenueSummary>(
    '/api/revenue-summary',
    fetcher,
    { revalidateOnFocus: false },
  );
  return { summary: data ?? null, loading: isLoading, mutate };
}
