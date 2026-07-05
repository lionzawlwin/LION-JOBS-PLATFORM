import { supabase } from '@/lib/supabase';
import type { StatsHistoryEntry } from '@/types';

function toEntry(row: {
  snapshot_date: string;
  jobs_count: number;
  candidates_count: number;
  companies_count: number;
  hired_count: number;
}): StatsHistoryEntry {
  return {
    snapshotDate:     row.snapshot_date,
    jobsCount:        row.jobs_count,
    candidatesCount:  row.candidates_count,
    companiesCount:   row.companies_count,
    hiredCount:       row.hired_count,
  };
}

// Computes today's aggregate counts and upserts a single row keyed on
// snapshot_date -- safe to run more than once on the same UTC day (a
// retried cron just overwrites today's row with the same/refreshed
// numbers rather than creating a duplicate).
export async function recordDailySnapshot(): Promise<void> {
  const [jobsRes, candidatesRes, companiesRes, hiredRes] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }),
    supabase.from('candidates').select('id', { count: 'exact', head: true }),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('candidates').select('id', { count: 'exact', head: true }).eq('stage', 'Hired'),
  ]);

  const counted = [
    ['jobs', jobsRes], ['candidates', candidatesRes],
    ['companies', companiesRes], ['hired', hiredRes],
  ] as const;
  for (const [label, res] of counted) {
    if (res.error) throw new Error(`Failed to count ${label} for stats snapshot: ${res.error.message}`);
  }

  const snapshotDate = new Date().toISOString().slice(0, 10);

  const { error } = await supabase.from('stats_history').upsert({
    snapshot_date:    snapshotDate,
    jobs_count:       jobsRes.count ?? 0,
    candidates_count: candidatesRes.count ?? 0,
    companies_count:  companiesRes.count ?? 0,
    hired_count:      hiredRes.count ?? 0,
  }, { onConflict: 'snapshot_date' });

  if (error) throw new Error(`Failed to record stats snapshot: ${error.message}`);
}

// Returns up to `days` most recent snapshots in chronological (oldest
// first) order -- the shape trend charts want to render left-to-right.
export async function getStatsHistory(days = 30): Promise<StatsHistoryEntry[]> {
  const { data, error } = await supabase
    .from('stats_history')
    .select('snapshot_date, jobs_count, candidates_count, companies_count, hired_count')
    .order('snapshot_date', { ascending: false })
    .limit(days);

  if (error) throw new Error(`Failed to load stats history: ${error.message}`);
  return (data ?? []).map(toEntry).reverse();
}
