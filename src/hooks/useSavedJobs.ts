'use client';

import { useCallback } from 'react';
import { useLocalStorageValue } from './useLocalStorageValue';

const KEY = 'lion_saved_jobs';
const EMPTY: string[] = [];

export function useSavedJobs() {
  const [savedIds, setSavedIds] = useLocalStorageValue<string[]>(KEY, EMPTY);

  const toggleSave = useCallback((jobId: string) => {
    setSavedIds(
      savedIds.includes(jobId)
        ? savedIds.filter((id) => id !== jobId)
        : [...savedIds, jobId],
    );
  }, [savedIds, setSavedIds]);

  const isSaved = useCallback((jobId: string) => savedIds.includes(jobId), [savedIds]);

  return { savedIds, toggleSave, isSaved };
}
