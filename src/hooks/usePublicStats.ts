'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface PublicStatsResponse { partnerCompanies: number; placements: number }

// Real homepage trust-signal counts (Layer 18 follow-on) -- see
// /api/public-stats/route.ts for what replaced the old hardcoded numbers.
export function usePublicStats() {
  const { data } = useSWR<PublicStatsResponse>('/api/public-stats', fetcher);
  return { partnerCompanies: data?.partnerCompanies ?? 0, placements: data?.placements ?? 0 };
}
