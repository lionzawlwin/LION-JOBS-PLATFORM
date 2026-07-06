'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JobRequestWithCompany } from '@/lib/jobRequestsView';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useJobRequests() {
  const { data, error, isLoading, mutate } = useSWR<JobRequestWithCompany[]>(
    '/api/job-requests',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { t } = useLanguage();

  async function approve(id: string, overridePlanCapacity = false) {
    const res = await fetch(`/api/job-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', overridePlanCapacity }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null) as { code?: string; error?: string } | null;
      if (body?.code === 'plan_capacity_exceeded' && !overridePlanCapacity) {
        if (window.confirm(`${body.error} Approve anyway?`)) {
          return approve(id, true);
        }
        return false;
      }
      toast.error(t('jr_toast_approve_failed'));
      return false;
    }
    await mutate();
    toast.success(t('jr_toast_approved'));
    return true;
  }

  async function reject(id: string, rejectionNote: string) {
    const res = await fetch(`/api/job-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectionNote }),
    });
    if (!res.ok) {
      toast.error(t('jr_toast_reject_failed'));
      return false;
    }
    await mutate();
    toast.success(t('jr_toast_rejected'));
    return true;
  }

  return {
    requests: data ?? [],
    loading: isLoading,
    error: error ? t('jr_toast_load_failed') : null,
    approve,
    reject,
  };
}
