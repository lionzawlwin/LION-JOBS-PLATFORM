'use client';

import useSWR from 'swr';
import type { Candidate, ApplicationStatus } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCandidates() {
  const { data, error, isLoading, mutate } = useSWR<Candidate[]>(
    '/api/candidates',
    fetcher,
    { revalidateOnFocus: false },
  );

  async function updateStage(id: string, stage: ApplicationStatus) {
    const prev = data ?? [];
    const next = prev.map((c) => (c.id === id ? { ...c, stage } : c));
    mutate(next, false);

    try {
      const res = await fetch(`/api/candidates/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error('Failed to update stage');
    } catch {
      mutate(prev, false);
    }
  }

  return {
    candidates: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load candidates.' : null,
    updateStage,
  };
}
