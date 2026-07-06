'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

// Fire-and-forget server-side view counter, separate from TrackJobView.tsx
// (which only maintains a client-local "recently viewed" list). Runs once
// per page mount; failures are silently ignored -- a missed view count is
// not worth surfacing an error for. Also fires a GA4 job_view event
// (real event tracking -- MarketingAnalytics.tsx's own comment claimed
// this existed before it actually did; see analytics.ts).
export function JobViewPing({ jobId }: { jobId: string }) {
  useEffect(() => {
    fetch(`/api/jobs/${jobId}/view`, { method: 'POST' }).catch(() => {});
    trackEvent('job_view', { job_id: jobId });
  }, [jobId]);

  return null;
}
