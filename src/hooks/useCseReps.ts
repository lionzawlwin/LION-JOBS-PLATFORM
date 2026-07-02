'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CseRep } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCseReps() {
  const { data, error, isLoading, mutate } = useSWR<CseRep[]>(
    '/api/cse',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { t } = useLanguage();

  async function addCse(input: { name: string; phone?: string; email?: string }) {
    const res = await fetch('/api/cse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      toast.error(t('ent_toast_cse_add_failed'));
      return false;
    }
    await mutate();
    toast.success(`${input.name} ${t('ent_toast_cse_added')}`);
    return true;
  }

  async function updateCse(id: string, update: Partial<CseRep>) {
    const res = await fetch(`/api/cse/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      toast.error(t('ent_toast_cse_update_failed'));
      return false;
    }
    await mutate();
    return true;
  }

  async function deleteCse(id: string) {
    const res = await fetch(`/api/cse/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error(t('ent_toast_cse_delete_failed'));
      return false;
    }
    await mutate();
    toast.success(t('ent_toast_cse_removed'));
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
