'use client';

import { useState } from 'react';
import useSWR from 'swr';
import type { AuditLogEntry, AuditAction } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const PAGE_SIZE = 50;
const MAX_LIMIT = 500;

export interface AuditLogFiltersInput {
  domain?: string;
  action?: AuditAction;
  actorEmail?: string;
  q?: string;
  from?: string;
  to?: string;
}

function buildQuery(filters: AuditLogFiltersInput, limit: number): string {
  const params = new URLSearchParams();
  if (filters.domain) params.set('domain', filters.domain);
  if (filters.action) params.set('action', filters.action);
  if (filters.actorEmail) params.set('actor', filters.actorEmail);
  if (filters.q) params.set('q', filters.q);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('limit', String(limit));
  params.set('offset', '0');
  return params.toString();
}

// "Load more" grows `limit` and always re-fetches from offset 0, rather
// than accumulating pages client-side -- avoids any effect-driven setState
// (this repo already carries pre-existing react-hooks/set-state-in-effect
// debt elsewhere; new code shouldn't add to it). Safe to re-derive on every
// filter change too: a stale, too-large `limit` just fetches a few extra
// rows for the new filter set, never wrong data.
export function useAuditLog(filters: AuditLogFiltersInput) {
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, error, isLoading } = useSWR<{ entries: AuditLogEntry[]; totalCount: number }>(
    `/api/audit-log?${buildQuery(filters, limit)}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  function loadMore() {
    setLimit((prev) => Math.min(prev + PAGE_SIZE, MAX_LIMIT));
  }

  function exportCsvUrl(): string {
    return `/api/audit-log?${buildQuery(filters, MAX_LIMIT)}&format=csv`;
  }

  // Layer 17: same export, actor identity replaced with role#n -- for
  // handing to an external party (enterprise procurement/security review).
  function exportRedactedCsvUrl(): string {
    return `/api/audit-log?${buildQuery(filters, MAX_LIMIT)}&format=csv&redact=true`;
  }

  const entries = data?.entries ?? [];
  const totalCount = data?.totalCount ?? 0;

  return {
    entries,
    totalCount,
    loading: isLoading,
    error: error ? 'Failed to load activity log.' : null,
    hasMore: entries.length < totalCount && limit < MAX_LIMIT,
    loadMore,
    exportCsvUrl,
    exportRedactedCsvUrl,
  };
}
