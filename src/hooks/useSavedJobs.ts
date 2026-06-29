'use client';

import { useState, useEffect, useCallback } from 'react';

const KEY = 'lion_saved_jobs';

function readIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function useSavedJobs() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSavedIds(readIds());
    // Keep multiple tabs/components in sync via storage events
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setSavedIds(readIds());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleSave = useCallback((jobId: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId];
      localStorage.setItem(KEY, JSON.stringify(next));
      // Notify other components on this page
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
      return next;
    });
  }, []);

  const isSaved = useCallback((jobId: string) => savedIds.includes(jobId), [savedIds]);

  return { savedIds, toggleSave, isSaved };
}
