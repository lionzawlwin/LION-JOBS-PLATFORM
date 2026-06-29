'use client';

import { useEffect } from 'react';

const KEY = 'lion_recent_views';
const MAX = 6;

export function TrackJobView({ jobId }: { jobId: string }) {
  useEffect(() => {
    try {
      const existing: string[] = JSON.parse(localStorage.getItem(KEY) ?? '[]');
      const next = [jobId, ...existing.filter((id) => id !== jobId)].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, [jobId]);

  return null;
}
