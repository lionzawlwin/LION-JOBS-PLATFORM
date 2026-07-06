'use client';

import useSWR from 'swr';
import type { EmployerVisibleApplicant } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface ApplicantsResponse {
  applicants: EmployerVisibleApplicant[];
  contactUnlockPriceMmk: number;
}

// Lazy, per-job fetch -- only queries when jobId is non-null, so expanding
// a job's applicant list in the Company Portal doesn't require fetching
// every job's applicants up front.
export function useJobApplicants(jobId: string | null) {
  const { data, isLoading, mutate } = useSWR<ApplicantsResponse>(
    jobId ? `/api/company-portal/jobs/${jobId}/applicants` : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  return {
    applicants: data?.applicants ?? [],
    contactUnlockPriceMmk: data?.contactUnlockPriceMmk ?? 0,
    loading: isLoading,
    mutate,
  };
}
