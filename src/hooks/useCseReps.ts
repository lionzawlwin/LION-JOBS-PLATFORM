'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { CseRep } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCseReps() {
  const { data, error, isLoading, mutate } = useSWR<CseRep[]>(
    '/api/cse',
    fetcher,
    { revalidateOnFocus: false },
  );

  async function addCse(input: { name: string; phone?: string; email?: string }) {
    const res = await fetch('/api/cse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      toast.error('Failed to add CSE');
      return false;
    }
    await mutate();
    toast.success(`${input.name} added`);
    return true;
  }

  async function updateCse(id: string, update: Partial<CseRep>) {
    const res = await fetch(`/api/cse/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      toast.error('Failed to update CSE');
      return false;
    }
    await mutate();
    return true;
  }

  async function deleteCse(id: string) {
    const res = await fetch(`/api/cse/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete CSE');
      return false;
    }
    await mutate();
    toast.success('CSE removed');
    return true;
  }

  return {
    cseReps: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load CSE reps.' : null,
    addCse,
    updateCse,
    deleteCse,
    mutate,
  };
}
