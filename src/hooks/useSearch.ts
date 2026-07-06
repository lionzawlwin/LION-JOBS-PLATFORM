'use client';

import { useEffect, useState } from 'react';
import type { SearchResult } from '@/types';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

// Stable reference for the short-query case -- a fresh `[]` literal on every
// call makes `results` a new object identity each render, which breaks any
// caller that resets state by comparing `results` against a previous
// render's value (see CommandPalette.tsx), triggering React error #301
// ("Too many re-renders") the moment something re-renders it with an empty
// query. Reusing one constant array keeps that comparison stable.
const EMPTY_RESULTS: SearchResult[] = [];

// Debounce via setTimeout inside useEffect, setState only in the timeout
// callback -- the documented escape hatch for react-hooks/set-state-in-effect
// (an external-timer callback, not a synchronous effect-body setState call).
// The short-query case is a derived return value below, not a setState
// reset inside the effect -- avoids that lint rule entirely for this branch.
export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const isShortQuery = query.trim().length < MIN_QUERY_LENGTH;

  useEffect(() => {
    if (isShortQuery) return;

    // setLoading(true) also lives inside the timer callback (not
    // synchronously at the top of the effect) -- keeps every setState call
    // in this effect gated behind the external timer, matching the escape
    // hatch described above. Side effect: no spinner during the debounce
    // window itself, which reads as reasonable (still deciding whether to
    // search, not yet searching).
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data: { results: SearchResult[] }) => setResults(data.results ?? []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return {
    results: isShortQuery ? EMPTY_RESULTS : results,
    loading: isShortQuery ? false : loading,
  };
}
