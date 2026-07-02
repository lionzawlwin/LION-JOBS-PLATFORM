'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Interaction } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInteractions(companyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Interaction[]>(
    `/api/interactions?company_id=${companyId}`,
    fetcher,
    { revalidateOnFocus: false },
  );
  const { t } = useLanguage();

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
      toast.error(t('ent_toast_interaction_failed'));
      return false;
    }
    await mutate();
    toast.success(t('ent_toast_interaction_logged'));
    return true;
  }

  async function deleteInteraction(id: string) {
    const prev = data ?? [];
    const next = prev.filter((i) => i.id !== id);
    mutate(next, false);

    try {
      const res = await fetch(`/api/interactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete interaction');
      toast.success(t('ent_toast_interaction_deleted'));
      return true;
    } catch {
      mutate(prev, false);
      toast.error(t('ent_toast_interaction_delete_failed'), { description: t('ent_toast_try_again') });
      return false;
    }
  }

  return {
    interactions: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load interactions.' : null,
    logInteraction,
    deleteInteraction,
    mutate,
  };
}
