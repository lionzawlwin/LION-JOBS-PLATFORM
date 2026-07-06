'use client';

import useSWR from 'swr';
import type { AccountPlan, CompanyPlanUsageRow } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAccountPlans() {
  const { data, isLoading, mutate } = useSWR<AccountPlan[]>('/api/account-plans', fetcher, { revalidateOnFocus: false });
  return { plans: data ?? [], loading: isLoading, mutate };
}

export function usePlanUsageSummary() {
  const { data, isLoading, mutate } = useSWR<CompanyPlanUsageRow[]>(
    '/api/account-plans/usage',
    fetcher,
    { revalidateOnFocus: false },
  );
  return { rows: data ?? [], loading: isLoading, mutate };
}
