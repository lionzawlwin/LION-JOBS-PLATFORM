'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Company, CompanyStatus, CompanyTier } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useEnterpriseAccounts() {
  const { data, error, isLoading, mutate } = useSWR<Company[]>(
    '/api/companies',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { t } = useLanguage();

  // Layer 10: internal companies (the repo owner's own F&B brands) never
  // have a real contract -- excluded unconditionally, no toggle, unlike
  // the Companies tab's opt-in "Show internal" filter. Enterprise is
  // specifically the B2B sales/contract pipeline; there's nothing here
  // for a toggle to ever reveal.
  const accounts = (data ?? []).filter((c) => c.tier === 'enterprise' && !c.isInternal);

  async function updateStatus(id: string, status: CompanyStatus) {
    const prev = data ?? [];
    const next = prev.map((c) => (c.id === id ? { ...c, status } : c));
    mutate(next, false);

    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(t('ent_toast_status_updated'));
      globalMutate('/api/enterprise/stats');
    } catch {
      mutate(prev, false);
      toast.error(t('ent_toast_status_failed'), { description: t('ent_toast_try_again') });
    }
  }

  async function addAccount(input: {
    name: string;
    contactPerson?: string;
    email: string;
    phone?: string;
    industry?: string;
    city?: string;
    notes?: string;
  }) {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        tier: 'enterprise' as CompanyTier,
        status: 'Lead' as CompanyStatus,
      }),
    });
    if (!res.ok) {
      toast.error(t('ent_toast_account_add_failed'));
      return false;
    }
    await mutate();
    toast.success(`${input.name} ${t('ent_toast_account_added')}`);
    globalMutate('/api/enterprise/stats');
    return true;
  }

  async function deleteAccount(id: string) {
    const prev = data ?? [];
    const next = prev.filter((c) => c.id !== id);
    mutate(next, false);

    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete account');
      globalMutate('/api/enterprise/stats');
      toast.success(t('ent_toast_account_deleted'));
      return true;
    } catch {
      mutate(prev, false);
      toast.error(t('ent_toast_account_delete_failed'), { description: t('ent_toast_try_again') });
      return false;
    }
  }

  return {
    accounts,
    loading: isLoading,
    error: error ? 'Failed to load enterprise accounts.' : null,
    updateStatus,
    addAccount,
    deleteAccount,
    mutate,
  };
}
