'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { Candidate, ApplicationStatus } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('Failed to load candidates.');
  return r.json();
});

const STAGE_LABELS: Record<ApplicationStatus, string> = {
  Applied:     'Applied',
  Shortlisted: 'Shortlisted',
  Interview:   'Interview',
  Hired:       '🎉 Hired',
};

export function useCandidates() {
  const { data, error, isLoading, mutate } = useSWR<Candidate[]>(
    '/api/candidates',
    fetcher,
    { revalidateOnFocus: false },
  );

  async function updateStage(id: string, stage: ApplicationStatus) {
    const prev = data ?? [];
    const candidate = prev.find((c) => c.id === id);

    // Optimistic update
    const next = prev.map((c) => (c.id === id ? { ...c, stage } : c));
    mutate(next, false);

    try {
      const res = await fetch(`/api/candidates/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });

      if (!res.ok) throw new Error('Failed to update stage');

      toast.success(`${candidate?.name ?? 'Candidate'} moved to ${STAGE_LABELS[stage]}`, {
        description: 'Saved.',
        duration: 3000,
      });
    } catch {
      // Roll back on failure
      mutate(prev, false);
      toast.error('Failed to update stage', {
        description: 'Could not save the change. Please try again.',
        duration: 4000,
      });
    }
  }

  async function deleteCandidate(id: string, name: string) {
    const prev = data ?? [];
    // Optimistic removal
    mutate(prev.filter((c) => c.id !== id), false);
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      toast.success(`${name} removed from pipeline`, { duration: 3000 });
    } catch {
      mutate(prev, false);
      toast.error('Failed to delete candidate', { description: 'Please try again.', duration: 4000 });
    }
  }

  return {
    candidates: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load candidates.' : null,
    updateStage,
    deleteCandidate,
    mutate,
  };
}
