'use client';

import useSWR from 'swr';
import type { CsePerformanceRow } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCsePerformance() {
  const { data, error, isLoading } = useSWR<{ rows: CsePerformanceRow[] }>(
    '/api/cse-performance',
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    rows: data?.rows ?? [],
    loading: isLoading,
    error: error ? true : false,
  };
}
