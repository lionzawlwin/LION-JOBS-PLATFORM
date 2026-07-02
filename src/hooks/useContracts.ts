'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Contract } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useContracts(companyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Contract[]>(
    `/api/contracts?company_id=${companyId}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { t } = useLanguage();

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
      toast.error(t('ent_toast_contract_add_failed'));
      return false;
    }
    await mutate();
    toast.success(t('ent_toast_contract_added'));
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
      toast.success(t('ent_toast_contract_updated'));
      globalMutate('/api/enterprise/stats');
      return true;
    } catch {
      mutate(prev, false);
      toast.error(t('ent_toast_contract_update_failed'), { description: t('ent_toast_try_again') });
      return false;
    }
  }

  async function deleteContract(id: string) {
    const prev = data ?? [];
    const next = prev.filter((c) => c.id !== id);
    mutate(next, false);

    try {
      const res = await fetch(`/api/contracts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete contract');
      toast.success(t('ent_toast_contract_deleted'));
      globalMutate('/api/enterprise/stats');
      return true;
    } catch {
      mutate(prev, false);
      toast.error(t('ent_toast_contract_delete_failed'), { description: t('ent_toast_try_again') });
      return false;
    }
  }

  return {
    contracts: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load contracts.' : null,
    addContract,
    updateContract,
    deleteContract,
    mutate,
  };
}

export function useAllContracts() {
  const { data, error, isLoading } = useSWR<Contract[]>(
    '/api/contracts',
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    contracts: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load contracts.' : null,
  };
}
