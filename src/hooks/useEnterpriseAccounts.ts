'use client';

import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import type { Company, CompanyStatus, CompanyTier } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useEnterpriseAccounts() {
  const { data, error, isLoading, mutate } = useSWR<Company[]>(
    '/api/companies',
    fetcher,
    { revalidateOnFocus: false },
  );

  const accounts = (data ?? []).filter((c) => c.tier === 'enterprise');

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
      toast.success('Account status updated');
      globalMutate('/api/enterprise/stats');
    } catch {
      mutate(prev, false);
      toast.error('Failed to update status', { description: 'Please try again.' });
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
      toast.error('Failed to add account');
      return false;
    }
    await mutate();
    toast.success(`${input.name} added`);
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
      toast.success('Account deleted');
      return true;
    } catch {
      mutate(prev, false);
      toast.error('Failed to delete account', { description: 'Please try again.' });
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
