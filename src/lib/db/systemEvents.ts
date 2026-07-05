import { supabase } from '@/lib/supabase';
import type { SystemEvent, FailureCategory, EventLevel, CronStatus } from '@/types';

function mapToSystemEvent(row: Record<string, unknown>): SystemEvent {
  return {
    id:         row.id as string,
    category:   row.category as FailureCategory,
    level:      row.level as EventLevel,
    route:      row.route as string,
    message:    row.message as string,
    context:    (row.context as SystemEvent['context']) ?? null,
    createdAt:  row.created_at as string,
    resolvedAt: (row.resolved_at as string) ?? null,
    resolvedBy: (row.resolved_by as string) ?? null,
  };
}

export async function appendSystemEvent(data: {
  category: FailureCategory;
  level?:   EventLevel;
  route:    string;
  message:  string;
  context?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const id = `evt-${crypto.randomUUID()}`;

  const { error } = await supabase.from('system_events').insert({
    id,
    category: data.category,
    level:    data.level ?? 'error',
    route:    data.route,
    message:  data.message,
    context:  data.context ?? null,
  });

  if (error) console.error('[db/systemEvents] appendSystemEvent failed:', error.message);
}

export async function listSystemEvents(filters: {
  category?: FailureCategory;
  days?:     number;
  // Defaults to 'unresolved' so a fixed problem stops showing as an active
  // failure once someone marks it resolved, instead of lingering for up to
  // 7 days (this function's max lookback). Callers that need the raw,
  // unfiltered failure count regardless of resolution state (e.g. spike
  // detection) should pass 'all' explicitly.
  resolved?: 'unresolved' | 'resolved' | 'all';
}): Promise<SystemEvent[]> {
  let query = supabase
    .from('system_events')
    .select('*')
    .eq('level', 'error')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.days) {
    const since = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const resolvedFilter = filters.resolved ?? 'unresolved';
  if (resolvedFilter === 'unresolved') query = query.is('resolved_at', null);
  else if (resolvedFilter === 'resolved') query = query.not('resolved_at', 'is', null);

  const { data, error } = await query;
  if (error) {
    console.error('[db/systemEvents] listSystemEvents failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapToSystemEvent);
}

// Phase 20 follow-up: the in-memory rate limiter (apiSecurity.ts) doesn't
// survive across serverless invocations, so "how often is this actually
// engaging" needs a durable count instead of reading the Map directly.
export async function getRateLimitHitCount(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('system_events')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'rate_limit')
    .gte('created_at', since);

  if (error) {
    console.error('[db/systemEvents] getRateLimitHitCount failed:', error.message);
    return 0;
  }
  return count ?? 0;
}

// First-mover-wins guard (`.is('resolved_at', null)`), matching this
// repo's established pattern (b2b_leads claiming, portal login tokens) —
// a second concurrent resolve attempt matches zero rows and silently
// no-ops rather than overwriting who/when it was actually resolved.
export async function resolveSystemEvent(id: string, resolvedBy: string): Promise<void> {
  const { error } = await supabase
    .from('system_events')
    .update({ resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq('id', id)
    .is('resolved_at', null);
  if (error) throw new Error(`Failed to resolve system event: ${error.message}`);
}

const CRON_ROUTES = ['/api/cron/job-alerts', '/api/cron/snapshot-stats', '/api/cron/weekly-email'];

export async function getCronStatus(): Promise<CronStatus[]> {
  const results = await Promise.all(
    CRON_ROUTES.map(async (route): Promise<CronStatus | null> => {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .eq('category', 'cron')
        .eq('route', route)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return {
        route,
        lastRunAt: data.created_at as string,
        ok:        data.level === 'info',
        message:   data.message as string,
      };
    }),
  );
  return results.filter((r): r is CronStatus => r !== null);
}
