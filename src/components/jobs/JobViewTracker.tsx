'use client';

import { useEffect } from 'react';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';

export function JobViewTracker({ jobId }: { jobId: string }) {
  const { addRecentView } = useRecentlyViewed();
  useEffect(() => {
    addRecentView(jobId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);
  return null;
}
