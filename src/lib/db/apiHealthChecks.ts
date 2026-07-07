import { supabase } from '@/lib/supabase';
import type { ApiHealthCheck, ApiHealthStatus } from '@/types';

// API/route health page (item #4 of the 2026-07-07 CTO big-upgrades
// portfolio). Written to only by the periodic synthetic check
// (src/lib/apiHealthCheck.ts), piggybacked on the existing daily
// job-alerts cron. Kept deliberately separate from system_events --
// system_events is error-only semantics (see FailureCategory), and a
// health ping succeeding every run would otherwise pollute that feed with
// non-failure noise.

function mapRow(row: Record<string, unknown>): ApiHealthCheck {
  return {
    id:        row.id as string,
    route:     row.route as string,
    latencyMs: row.latency_ms as number,
    status:    row.status as ApiHealthStatus,
    checkedAt: row.checked_at as string,
  };
}

// Never throws -- matches appendSystemEvent()'s contract. Recording a
// health-check result must not itself become a new failure for the
// synthetic check that's piggybacking on the job-alerts cron.
export async function recordApiHealthCheck(data: {
  route: string;
  latencyMs: number;
  status: ApiHealthStatus;
}): Promise<void> {
  const { error } = await supabase.from('api_health_checks').insert({
    route:      data.route,
    latency_ms: data.latencyMs,
    status:     data.status,
  });
  if (error) console.error('[db/apiHealthChecks] recordApiHealthCheck failed:', error.message);
}

// Returns every sample in the last `hours` window (default 24h), across
// all routes -- the dashboard panel groups/aggregates client-side (see
// summarizeApiHealthChecks() in src/lib/apiHealthSummary.ts), same split
// of responsibility as listSystemEventsForTrend()/computeDailyErrorCounts().
// Capped at 1000 rows: at this check's actual sample rate (3-4 routes,
// once/day) that's a multi-year window, not a real ceiling risk.
export async function getRecentApiHealthChecks(hours = 24): Promise<ApiHealthCheck[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('api_health_checks')
    .select('*')
    .gte('checked_at', since)
    .order('checked_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('[db/apiHealthChecks] getRecentApiHealthChecks failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapRow);
}
