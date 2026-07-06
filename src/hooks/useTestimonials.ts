'use client';

import useSWR from 'swr';
import type { TestimonialRecord } from '@/lib/db/feedback';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface TestimonialsResponse { testimonials: TestimonialRecord[] }

// Public, approved-only testimonials for the homepage (Layer 18).
export function useTestimonials() {
  const { data, isLoading } = useSWR<TestimonialsResponse>('/api/testimonials', fetcher);
  return { testimonials: data?.testimonials ?? [], isLoading };
}

// Staff moderation queue (Content tab) -- pending, consented feedback
// awaiting an approve/reject decision.
export function usePendingTestimonials() {
  const { data, isLoading, mutate } = useSWR<TestimonialsResponse>('/api/testimonials?scope=admin', fetcher);
  return { pending: data?.testimonials ?? [], isLoading, mutate };
}
