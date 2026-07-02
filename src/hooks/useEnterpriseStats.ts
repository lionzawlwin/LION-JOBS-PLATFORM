'use client';

import useSWR from 'swr';
import type { EnterpriseStats } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EMPTY_STATS: EnterpriseStats = {
  totalActiveContractValue: 0,
  activeContractsCount: 0,
  enterpriseAccountsCount: 0,
  topCse: null,
};

export function useEnterpriseStats() {
  const { data, error, isLoading, mutate } = useSWR<EnterpriseStats>(
    '/api/enterprise/stats',
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    stats: data ?? EMPTY_STATS,
    loading: isLoading,
    error: error ? 'Failed to load enterprise stats.' : null,
    mutate,
  };
}
