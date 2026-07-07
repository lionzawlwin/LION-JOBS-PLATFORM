'use client';

import useSWR from 'swr';

interface ContactUnlockSettings {
  priceMmk: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Mirrors useJobBoostSettings.ts -- same SWR shape, no durationDays since
// a contact unlock doesn't expire.
export function useContactUnlockSettings() {
  const { data, isLoading, mutate } = useSWR<ContactUnlockSettings>(
    '/api/contact-unlock-settings',
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    settings: data ?? { priceMmk: 0 },
    loading:  isLoading,
    mutate,
  };
}
