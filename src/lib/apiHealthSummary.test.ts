import { describe, it, expect } from 'vitest';
import { summarizeApiHealthChecks } from './apiHealthSummary';
import type { ApiHealthCheck } from '@/types';

function check(overrides: Partial<ApiHealthCheck> = {}): ApiHealthCheck {
  return {
    id:        'chk-1',
    route:     '/api/jobs',
    latencyMs: 100,
    status:    'ok',
    checkedAt: '2026-07-07T09:00:00.000Z',
    ...overrides,
  };
}

describe('summarizeApiHealthChecks', () => {
  it('returns an empty list for no samples', () => {
    expect(summarizeApiHealthChecks([])).toEqual([]);
  });

  it('summarizes a single route with one sample', () => {
    const result = summarizeApiHealthChecks([check()]);
    expect(result).toEqual([{
      route:           '/api/jobs',
      latestStatus:    'ok',
      latestLatencyMs: 100,
      latestCheckedAt: '2026-07-07T09:00:00.000Z',
      avgLatencyMs:    100,
      sampleCount:     1,
      failCount:       0,
    }]);
  });

  it('picks the most recent sample as latest, regardless of input order', () => {
    const older = check({ id: 'chk-1', latencyMs: 50, checkedAt: '2026-07-07T08:00:00.000Z' });
    const newer = check({ id: 'chk-2', latencyMs: 200, status: 'fail', checkedAt: '2026-07-07T09:00:00.000Z' });
    const result = summarizeApiHealthChecks([older, newer]);
    expect(result[0].latestLatencyMs).toBe(200);
    expect(result[0].latestStatus).toBe('fail');
    expect(result[0].latestCheckedAt).toBe('2026-07-07T09:00:00.000Z');
  });

  it('averages latency across all samples for the route', () => {
    const samples = [
      check({ id: 'chk-1', latencyMs: 100 }),
      check({ id: 'chk-2', latencyMs: 200 }),
      check({ id: 'chk-3', latencyMs: 300 }),
    ];
    const result = summarizeApiHealthChecks(samples);
    expect(result[0].avgLatencyMs).toBe(200);
    expect(result[0].sampleCount).toBe(3);
  });

  it('counts failures within the window', () => {
    const samples = [
      check({ id: 'chk-1', status: 'ok' }),
      check({ id: 'chk-2', status: 'fail' }),
      check({ id: 'chk-3', status: 'fail' }),
    ];
    const result = summarizeApiHealthChecks(samples);
    expect(result[0].failCount).toBe(2);
  });

  it('groups multiple routes independently, sorted by route name', () => {
    const samples = [
      check({ id: 'chk-1', route: '/dashboard', latencyMs: 400 }),
      check({ id: 'chk-2', route: '/api/jobs', latencyMs: 100 }),
      check({ id: 'chk-3', route: '/api/system-events', latencyMs: 50 }),
    ];
    const result = summarizeApiHealthChecks(samples);
    expect(result.map((r) => r.route)).toEqual([
      '/api/jobs', '/api/system-events', '/dashboard',
    ]);
  });
});
