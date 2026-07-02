'use client';

import useSWR from 'swr';
import type { Staff, StaffRole } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStaff() {
  const { data, error, isLoading, mutate } = useSWR<Staff[]>(
    '/api/staff',
    fetcher,
    { revalidateOnFocus: false },
  );

  async function addStaff(input: { email: string; name: string; role: StaffRole }) {
    const res = await fetch('/api/staff', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(input),
    });
    if (!res.ok) return false;
    await mutate();
    return true;
  }

  async function updateStaffMember(id: string, update: Partial<{ name: string; role: StaffRole; active: boolean }>) {
    const res = await fetch(`/api/staff/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(update),
    });
    if (!res.ok) return false;
    await mutate();
    return true;
  }

  return {
    staff: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load staff.' : null,
    addStaff,
    updateStaffMember,
    mutate,
  };
}
