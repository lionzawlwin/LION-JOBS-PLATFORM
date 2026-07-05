import { describe, it, expect } from 'vitest';
import { summarizeBulkResults } from './bulkActions';

describe('summarizeBulkResults', () => {
  it('counts all fulfilled-true as succeeded', () => {
    const results: PromiseSettledResult<boolean>[] = [
      { status: 'fulfilled', value: true },
      { status: 'fulfilled', value: true },
    ];
    expect(summarizeBulkResults(results)).toEqual({ succeeded: 2, failed: 0 });
  });

  it('counts fulfilled-false as failed', () => {
    const results: PromiseSettledResult<boolean>[] = [
      { status: 'fulfilled', value: true },
      { status: 'fulfilled', value: false },
    ];
    expect(summarizeBulkResults(results)).toEqual({ succeeded: 1, failed: 1 });
  });

  it('counts rejected as failed', () => {
    const results: PromiseSettledResult<boolean>[] = [
      { status: 'fulfilled', value: true },
      { status: 'rejected', reason: new Error('boom') },
    ];
    expect(summarizeBulkResults(results)).toEqual({ succeeded: 1, failed: 1 });
  });

  it('returns zeroes for an empty result set', () => {
    expect(summarizeBulkResults([])).toEqual({ succeeded: 0, failed: 0 });
  });
});
