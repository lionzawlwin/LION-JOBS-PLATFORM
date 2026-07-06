import { describe, it, expect } from 'vitest';
import { readCachedSnapshot } from './useLocalStorageValue';

// This is the one part of useLocalStorageValue with real correctness risk:
// useSyncExternalStore calls getSnapshot on every render and re-renders
// forever if it ever returns a new value/reference when the underlying
// raw string hasn't actually changed. Extracted as a pure function
// specifically so this can be tested directly, without a DOM/React
// rendering environment this project's plain-Node vitest setup doesn't have.
describe('readCachedSnapshot', () => {
  it('parses JSON on first read (no cache yet)', () => {
    const result = readCachedSnapshot('["a","b"]', null, []);
    expect(result).toEqual({ raw: '["a","b"]', value: ['a', 'b'] });
  });

  it('returns the exact same cache object when raw is unchanged', () => {
    const first = readCachedSnapshot('["a"]', null, []);
    const second = readCachedSnapshot('["a"]', first, []);
    expect(second).toBe(first);
  });

  it('re-parses when raw changes', () => {
    const first = readCachedSnapshot('["a"]', null, []);
    const second = readCachedSnapshot('["b"]', first, []);
    expect(second).not.toBe(first);
    expect(second.value).toEqual(['b']);
  });

  it('falls back to defaultValue when raw is null (key not set)', () => {
    const DEFAULT: string[] = [];
    const result = readCachedSnapshot(null, null, DEFAULT);
    expect(result.value).toBe(DEFAULT);
  });

  it('falls back to defaultValue on invalid/legacy non-JSON raw content rather than throwing', () => {
    const result = readCachedSnapshot('not-valid-json', null, 'fallback');
    expect(result.value).toBe('fallback');
  });

  it('treats a transition from a set value back to null as a real change, not a cache hit', () => {
    const first = readCachedSnapshot('"en"', null, 'en');
    const second = readCachedSnapshot(null, first, 'en');
    expect(second).not.toBe(first);
    expect(second.raw).toBeNull();
  });
});
