import { supabase } from '@/lib/supabase';
import type { SystemEvent, FailureCategory, EventLevel, CronStatus } from '@/types';

function mapToSystemEvent(row: Record<string, unknown>): SystemEvent {
  return {
    id:        row.id as string,
    category:  row.category as FailureCategory,
    level:     row.level as EventLevel,
    route:     row.route as string,
    message:   row.message as string,
    context:   (row.context as SystemEvent['context']) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function appendSystemEvent(data: {
  category: FailureCategory;
  level?:   EventLevel;
  route:    string;
  message:  string;
  context?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

  const { data, error } = await query;
  if (error) {
    console.error('[db/systemEvents] listSystemEvents failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapToSystemEvent);
}

const CRON_ROUTES = ['/api/cron/job-alerts', '/api/cron/weekly-email'];

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
