'use client';

import useSWR from 'swr';
import type { NotificationItem } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useNotifications() {
  const { data, error, isLoading } = useSWR<{ items: NotificationItem[]; totalCount: number }>(
    '/api/notifications',
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 },
  );

  return {
    items: data?.items ?? [],
    totalCount: data?.totalCount ?? 0,
    loading: isLoading,
    error: error ? true : false,
  };
}
