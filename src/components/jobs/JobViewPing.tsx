'use client';

import { useEffect } from 'react';

// Fire-and-forget server-side view counter, separate from TrackJobView.tsx
// (which only maintains a client-local "recently viewed" list). Runs once
// per page mount; failures are silently ignored -- a missed view count is
// not worth surfacing an error for.
export function JobViewPing({ jobId }: { jobId: string }) {
  useEffect(() => {
    fetch(`/api/jobs/${jobId}/view`, { method: 'POST' }).catch(() => {});
  }, [jobId]);

  return null;
}
