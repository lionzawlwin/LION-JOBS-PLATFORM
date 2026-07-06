'use client';

import useSWR from 'swr';

interface OptInCampaignStats {
  eligible: number;
  sent: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOptInCampaign() {
  const { data, isLoading, mutate } = useSWR<OptInCampaignStats>(
    '/api/opt-in-campaign/status',
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    stats: data ?? { eligible: 0, sent: 0 },
    loading: isLoading,
    mutate,
  };
}
