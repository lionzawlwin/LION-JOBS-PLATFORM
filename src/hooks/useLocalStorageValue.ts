'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';

// Shared primitive behind every "read/write a value under one localStorage
// key, stay in sync across tabs" hook in this app (useProfile, useSavedJobs,
// useRecentlyViewed, the dashboard sidebar's collapsed flag, the language
// toggle, the job-alert category picker). Built on useSyncExternalStore --
// the API React itself provides for "subscribe to an external mutable
// source" -- instead of the "read localStorage in a useEffect, setState
// once" pattern each of those hooks previously hand-rolled independently.
// react-hooks/set-state-in-effect (new in React 19's linter) flags exactly
// that hand-rolled pattern; the reconciliation effect useSyncExternalStore
// schedules internally to swap an SSR-safe first render for the real
// client value is the sanctioned place for this, which is why using it
// here makes the warning go away correctly instead of suppressing it.
function subscribe(key: string, onChange: () => void): () => void {
  function onStorage(e: StorageEvent) {
    if (e.key === key) onChange();
  }
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

export interface SnapshotCache<T> {
  raw: string | null;
  value: T;
}

// Pulled out as a pure function (no React, no DOM) specifically so it's
// unit-testable in this project's plain Node vitest environment, which has
// no jsdom/React-rendering setup -- this is the one part of the hook with
// real correctness risk (useSyncExternalStore re-renders forever if
// getSnapshot ever returns a new value/reference when nothing actually
// changed), so it's the one part worth testing directly rather than only
// via tsc + manual review.
export function readCachedSnapshot<T>(
  raw: string | null,
  cache: SnapshotCache<T> | null,
  defaultValue: T,
): SnapshotCache<T> {
  if (cache !== null && cache.raw === raw) return cache;
  let value = defaultValue;
  if (raw !== null) {
    try { value = JSON.parse(raw) as T; } catch { value = defaultValue; }
  }
  return { raw, value };
}

export function useLocalStorageValue<T>(
  key: string,
  defaultValue: T,
): [T, (value: T) => void] {
  // getSnapshot must return a referentially stable value when nothing
  // changed, or useSyncExternalStore re-renders forever -- cache the last
  // parsed value against the raw string it came from, and only re-parse
  // when the raw string itself actually changes (readCachedSnapshot above).
  const cacheRef = useRef<SnapshotCache<T> | null>(null);

  const getSnapshot = useCallback((): T => {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      raw = null;
    }
    cacheRef.current = readCachedSnapshot(raw, cacheRef.current, defaultValue);
    return cacheRef.current.value;
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(
    (onChange) => subscribe(key, onChange),
    getSnapshot,
    getServerSnapshot,
  );

  const setValue = useCallback((next: T) => {
    try {
      if (next === null || next === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(next));
      }
    } catch {
      // ignore storage errors (e.g. private-browsing quota)
    }
    // Native `storage` events only fire in *other* tabs -- dispatch one
    // manually so same-tab subscribers (this hook's own useSyncExternalStore
    // subscription) notice the change too.
    window.dispatchEvent(new StorageEvent('storage', { key }));
  }, [key]);

  return [value, setValue];
}

// Standard useSyncExternalStore-based "has the client finished its real
// first render yet" flag -- replaces the ad-hoc `useState(false)` +
// `useEffect(() => setMounted(true), [])` idiom (itself flagged by
// react-hooks/set-state-in-effect) used to gate content that would
// otherwise mismatch between server and client render output.
function subscribeNever(): () => void {
  return () => {};
}
export function useHasHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
