'use client';

import { useCallback } from 'react';
import { useLocalStorageValue } from './useLocalStorageValue';

const KEY = 'lion_recent_views';
const MAX = 6;
const EMPTY: string[] = [];

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useLocalStorageValue<string[]>(KEY, EMPTY);

  const addRecentView = useCallback((jobId: string) => {
    setRecentIds([jobId, ...recentIds.filter((id) => id !== jobId)].slice(0, MAX));
  }, [recentIds, setRecentIds]);

  const removeRecentView = useCallback((jobId: string) => {
    setRecentIds(recentIds.filter((id) => id !== jobId));
  }, [recentIds, setRecentIds]);

  return { recentIds, addRecentView, removeRecentView };
}
