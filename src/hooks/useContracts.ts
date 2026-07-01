'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import type { Contract } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useContracts(companyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Contract[]>(
    `/api/contracts?company_id=${companyId}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  async function addContract(input: {
    companyId:     string;
    value:         number;
    currency?:     string;
    contractType?: string;
    status?:       string;
    startDate?:    string;
    endDate?:      string;
    cseId?:        string;
    notes?:        string;
  }) {
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      toast.error('Failed to add contract');
      return false;
    }
    await mutate();
    toast.success('Contract added');
    globalMutate('/api/enterprise/stats');
    return true;
  }

  async function updateContract(id: string, update: Partial<Contract>) {
    const prev = data ?? [];
    const next = prev.map((c) => (c.id === id ? { ...c, ...update } : c));
    mutate(next, false);

    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error('Failed to update contract');
      toast.success('Contract updated');
      globalMutate('/api/enterprise/stats');
      return true;
    } catch {
      mutate(prev, false);
      toast.error('Failed to update contract', { description: 'Please try again.' });
      return false;
    }
  }

  return {
    contracts: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load contracts.' : null,
    addContract,
    updateContract,
    mutate,
  };
}
