import type { SystemEvent } from '@/types';

export type CronDayStatus = 'ok' | 'fail' | 'none';

function buildDayBuckets(days: number, now: Date): string[] {
  const buckets: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    buckets.push(d.toISOString().slice(0, 10));
  }
  return buckets;
}

export function computeDailyErrorCounts(events: SystemEvent[], days: number, now: Date): { date: string; count: number }[] {
  const buckets = buildDayBuckets(days, now);
  const counts = new Map(buckets.map((d) => [d, 0]));

  for (const evt of events) {
    if (evt.level !== 'error') continue;
    const day = evt.createdAt.slice(0, 10);
    if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return buckets.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

// Events are expected pre-sorted ascending by createdAt (listSystemEventsForTrend
// orders that way) -- the last matching event for a day is treated as that
// day's outcome, matching getCronStatus()'s "most recent wins" precedent.
export function computeCronDayStatus(events: SystemEvent[], days: number, now: Date): Record<string, CronDayStatus[]> {
  const buckets = buildDayBuckets(days, now);
  const cronEvents = events.filter((e) => e.category === 'cron');
  const routes = Array.from(new Set(cronEvents.map((e) => e.route))).sort();

  const result: Record<string, CronDayStatus[]> = {};
  for (const route of routes) {
    const routeEvents = cronEvents.filter((e) => e.route === route);
    result[route] = buckets.map((date) => {
      const dayEvents = routeEvents.filter((e) => e.createdAt.slice(0, 10) === date);
      if (dayEvents.length === 0) return 'none';
      const last = dayEvents[dayEvents.length - 1];
      return last.level === 'info' ? 'ok' : 'fail';
    });
  }
  return result;
}
