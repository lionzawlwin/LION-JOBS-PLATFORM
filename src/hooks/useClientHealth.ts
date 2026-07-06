'use client';

import useSWR from 'swr';
import type { ClientHealthSummary } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EMPTY_SUMMARY: ClientHealthSummary = {
  accounts: [],
  counts: { green: 0, yellow: 0, red: 0 },
};

export function useClientHealth() {
  const { data, error, isLoading, mutate } = useSWR<ClientHealthSummary>(
    '/api/enterprise/health',
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    summary: data ?? EMPTY_SUMMARY,
    loading: isLoading,
    error: error ? 'Failed to load client health.' : null,
    mutate,
  };
}
