import type { ApiHealthCheck } from '@/types';

export interface RouteHealthSummary {
  route: string;
  latestStatus: ApiHealthCheck['status'];
  latestLatencyMs: number;
  latestCheckedAt: string;
  avgLatencyMs: number;
  sampleCount: number;
  failCount: number;
}

// Pure aggregation over a flat list of samples (as returned by
// getRecentApiHealthChecks()) into one summary row per route, sorted by
// route name for a stable render order. Mirrors the
// listSystemEventsForTrend()/computeDailyErrorCounts() split -- the DB
// accessor returns raw rows, this function does the grouping so it's
// unit-testable without a Supabase mock.
export function summarizeApiHealthChecks(checks: ApiHealthCheck[]): RouteHealthSummary[] {
  const byRoute = new Map<string, ApiHealthCheck[]>();
  for (const check of checks) {
    const list = byRoute.get(check.route) ?? [];
    list.push(check);
    byRoute.set(check.route, list);
  }

  const summaries: RouteHealthSummary[] = [];
  for (const [route, samples] of byRoute.entries()) {
    const sorted = [...samples].sort(
      (a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime(),
    );
    const latest = sorted[0];
    const totalLatency = samples.reduce((sum, s) => sum + s.latencyMs, 0);

    summaries.push({
      route,
      latestStatus:    latest.status,
      latestLatencyMs: latest.latencyMs,
      latestCheckedAt: latest.checkedAt,
      avgLatencyMs:    Math.round(totalLatency / samples.length),
      sampleCount:     samples.length,
      failCount:       samples.filter((s) => s.status === 'fail').length,
    });
  }

  return summaries.sort((a, b) => a.route.localeCompare(b.route));
}
