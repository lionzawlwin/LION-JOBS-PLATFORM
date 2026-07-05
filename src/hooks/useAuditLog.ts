'use client';

import useSWR from 'swr';
import type { AuditLogEntry } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAuditLog(domain?: string) {
  const query = domain ? `?domain=${encodeURIComponent(domain)}` : '';
  const { data, error, isLoading } = useSWR<AuditLogEntry[]>(
    `/api/audit-log${query}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    entries: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load activity log.' : null,
  };
}
