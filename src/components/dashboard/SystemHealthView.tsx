'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import type { SystemEvent, CronStatus, FailureCategory } from '@/types';

const CATEGORIES: FailureCategory[] = ['webhook', 'ai_scoring', 'invoicing', 'cron', 'other'];

const CATEGORY_LABELS: Record<FailureCategory, string> = {
  webhook:    'Webhook',
  ai_scoring: 'AI Scoring',
  invoicing:  'Invoicing',
  cron:       'Cron',
  other:      'Other',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function SystemHealthView() {
  const [events, setEvents]         = useState<SystemEvent[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<FailureCategory | ''>('');
  const [days, setDays]             = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/system-events?${params.toString()}`);
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setEvents(data.events ?? []);
      setCronStatus(data.cronStatus ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, days]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">Cron Job Status</h3>
        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cronStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cron runs recorded yet.</p>
        ) : (
          cronStatus.map((c) => (
            <div key={c.route} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              {c.ok
                ? <ShieldCheck size={20} className="shrink-0 text-emerald-600" />
                : <ShieldAlert size={20} className="shrink-0 text-red-600" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{c.route}</p>
                <p className="text-xs text-muted-foreground truncate">{c.message}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(c.lastRunAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h3 className="text-sm font-bold text-foreground">Recent Failures</h3>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as FailureCategory | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle size={36} className="text-red-500/60" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t load system events. Please try again.</p>
          <button
            onClick={() => load()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ShieldCheck size={36} className="text-emerald-500/40" />
          <p className="text-sm text-muted-foreground">No failures in this range.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3">Category</th>
                <th className="p-3">Route</th>
                <th className="p-3">Message</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-border/50">
                  <td className="p-3">
                    <span className="rounded-full bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
                      {CATEGORY_LABELS[ev.category]}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{ev.route}</td>
                  <td className="p-3 text-muted-foreground">{ev.message}</td>
                  <td className="p-3 text-muted-foreground">{fmtDateTime(ev.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
