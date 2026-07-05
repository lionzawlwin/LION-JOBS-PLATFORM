import { describe, it, expect } from 'vitest';
import { computeDailyErrorCounts, computeCronDayStatus } from './healthTrends';
import type { SystemEvent } from '@/types';

const NOW = new Date('2026-07-06T12:00:00.000Z');

function event(overrides: Partial<SystemEvent> = {}): SystemEvent {
  return {
    id: 'evt-1', category: 'other', level: 'error', route: '/api/x',
    message: 'boom', context: null, createdAt: '2026-07-06T00:00:00.000Z',
    resolvedAt: null, resolvedBy: null, ...overrides,
  };
}

describe('computeDailyErrorCounts', () => {
  it('returns one bucket per day, oldest first', () => {
    const result = computeDailyErrorCounts([], 3, NOW);
    expect(result.map((b) => b.date)).toEqual(['2026-07-04', '2026-07-05', '2026-07-06']);
  });

  it('counts error-level events on their day', () => {
    const events = [
      event({ createdAt: '2026-07-06T01:00:00.000Z' }),
      event({ id: 'evt-2', createdAt: '2026-07-06T02:00:00.000Z' }),
      event({ id: 'evt-3', createdAt: '2026-07-05T01:00:00.000Z' }),
    ];
    const result = computeDailyErrorCounts(events, 3, NOW);
    expect(result).toEqual([
      { date: '2026-07-04', count: 0 },
      { date: '2026-07-05', count: 1 },
      { date: '2026-07-06', count: 2 },
    ]);
  });

  it('excludes info-level events', () => {
    const events = [event({ level: 'info' })];
    const result = computeDailyErrorCounts(events, 1, NOW);
    expect(result).toEqual([{ date: '2026-07-06', count: 0 }]);
  });

  it('excludes events outside the bucket window', () => {
    const events = [event({ createdAt: '2026-01-01T00:00:00.000Z' })];
    const result = computeDailyErrorCounts(events, 3, NOW);
    expect(result.every((b) => b.count === 0)).toBe(true);
  });
});

describe('computeCronDayStatus', () => {
  it('marks a day with no cron event as none', () => {
    const result = computeCronDayStatus([], 2, NOW);
    expect(result).toEqual({});
  });

  it('marks a day with a success event as ok', () => {
    const events = [event({ category: 'cron', level: 'info', route: '/api/cron/job-alerts', createdAt: '2026-07-06T09:00:00.000Z' })];
    const result = computeCronDayStatus(events, 2, NOW);
    expect(result['/api/cron/job-alerts']).toEqual(['none', 'ok']);
  });

  it('marks a day with a failure event as fail', () => {
    const events = [event({ category: 'cron', level: 'error', route: '/api/cron/job-alerts', createdAt: '2026-07-06T09:00:00.000Z' })];
    const result = computeCronDayStatus(events, 1, NOW);
    expect(result['/api/cron/job-alerts']).toEqual(['fail']);
  });

  it('uses the last event of the day when a route has multiple', () => {
    const events = [
      event({ category: 'cron', level: 'error', route: '/api/cron/job-alerts', createdAt: '2026-07-06T01:00:00.000Z' }),
      event({ id: 'evt-2', category: 'cron', level: 'info', route: '/api/cron/job-alerts', createdAt: '2026-07-06T09:00:00.000Z' }),
    ];
    const result = computeCronDayStatus(events, 1, NOW);
    expect(result['/api/cron/job-alerts']).toEqual(['ok']);
  });

  it('tracks multiple cron routes independently', () => {
    const events = [
      event({ category: 'cron', level: 'info', route: '/api/cron/job-alerts', createdAt: '2026-07-06T09:00:00.000Z' }),
      event({ id: 'evt-2', category: 'cron', level: 'error', route: '/api/cron/weekly-email', createdAt: '2026-07-06T09:00:00.000Z' }),
    ];
    const result = computeCronDayStatus(events, 1, NOW);
    expect(result).toEqual({
      '/api/cron/job-alerts': ['ok'],
      '/api/cron/weekly-email': ['fail'],
    });
  });

  it('ignores non-cron-category events', () => {
    const events = [event({ category: 'webhook', level: 'error', route: '/api/cron/job-alerts' })];
    const result = computeCronDayStatus(events, 1, NOW);
    expect(result).toEqual({});
  });
});
