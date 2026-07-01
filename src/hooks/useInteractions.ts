'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { Interaction } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInteractions(companyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Interaction[]>(
    `/api/interactions?company_id=${companyId}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  async function logInteraction(input: {
    companyId:      string;
    type:           string;
    note:           string;
    loggedByCseId?: string;
  }) {
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      toast.error('Failed to log interaction');
      return false;
    }
    await mutate();
    toast.success('Interaction logged');
    return true;
  }

  return {
    interactions: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load interactions.' : null,
    logInteraction,
    mutate,
  };
}
