'use client';

import { useState, useEffect, useCallback } from 'react';

const KEY = 'lion_recent_views';
const MAX = 6;

function getStored(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getStored());
    function onStorage(e: StorageEvent) {
      if (e.key === KEY) setRecentIds(getStored());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addRecentView = useCallback((jobId: string) => {
    setRecentIds((prev) => {
      const next = [jobId, ...prev.filter((id) => id !== jobId)].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const removeRecentView = useCallback((jobId: string) => {
    setRecentIds((prev) => {
      const next = prev.filter((id) => id !== jobId);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { recentIds, addRecentView, removeRecentView };
}
