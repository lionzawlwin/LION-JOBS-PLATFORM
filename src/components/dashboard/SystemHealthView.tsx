'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, CircleAlert, CircleSlash, Gauge, Check } from 'lucide-react';
import { Sparkline } from './TrendChart';
import type { SystemEvent, CronStatus, FailureCategory } from '@/types';
import type { CronDayStatus } from '@/lib/healthTrends';

type ResolvedFilter = 'unresolved' | 'resolved' | 'all';

interface HealthTrend {
  dailyErrorCounts: { date: string; count: number }[];
  cronDayStatus: Record<string, CronDayStatus[]>;
}

const EMPTY_TREND: HealthTrend = { dailyErrorCounts: [], cronDayStatus: {} };

const DAY_STATUS_COLOR: Record<CronDayStatus, string> = {
  ok:   'bg-emerald-500',
  fail: 'bg-red-500',
  none: 'bg-muted',
};

interface IntegrationStatus {
  name: string;
  configured: boolean;
  optional: boolean;
  detail: string;
}

const CATEGORIES: FailureCategory[] = ['webhook', 'ai_scoring', 'invoicing', 'cron', 'other'];

const CATEGORY_LABELS: Record<FailureCategory, string> = {
  webhook:    'Webhook',
  ai_scoring: 'AI Scoring',
  invoicing:  'Invoicing',
  cron:       'Cron',
  other:      'Other',
  // Not in CATEGORIES/the filter dropdown (see VALID_CATEGORIES's comment
  // in the API route) -- kept here only so this Record<FailureCategory,
  // string> stays exhaustive against the type.
  rate_limit: 'Rate Limit',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function SystemHealthView() {
  const [events, setEvents]         = useState<SystemEvent[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<FailureCategory | ''>('');
  const [resolvedFilter, setResolvedFilter] = useState<ResolvedFilter>('unresolved');
  const [days, setDays]             = useState(7);
  const [rateLimitHits24h, setRateLimitHits24h] = useState<number | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [trend, setTrend] = useState<HealthTrend>(EMPTY_TREND);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ days: String(days), resolved: resolvedFilter });
      if (categoryFilter) params.set('category', categoryFilter);
      const [eventsRes, integrationsRes] = await Promise.all([
        fetch(`/api/system-events?${params.toString()}`),
        fetch('/api/integrations-status'),
      ]);
      if (!eventsRes.ok) {
        setError(true);
        return;
      }
      const data = await eventsRes.json();
      setEvents(data.events ?? []);
      setCronStatus(data.cronStatus ?? []);
      setRateLimitHits24h(typeof data.rateLimitHits24h === 'number' ? data.rateLimitHits24h : null);
      setTrend(data.trend ?? EMPTY_TREND);
      if (integrationsRes.ok) {
        const integrationsData = await integrationsRes.json();
        setIntegrations(integrationsData.integrations ?? []);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, resolvedFilter, days]);

  useEffect(() => { load(); }, [load]);

  async function handleResolve(id: string) {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/system-events/${id}/resolve`, { method: 'PATCH' });
      if (res.ok) await load();
    } catch (err) {
      console.error('[SystemHealthView] resolve error:', err);
    } finally {
      setResolvingId(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Integration Status — is each integration even configured?
          system_events (below) only records activity that happened; an
          unconfigured integration silently no-ops and never shows up
          there at all. This answers a different question: is it turned
          on in the first place. */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Integration Status</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            integrations.map((i) => (
              <div key={i.name} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                {i.configured ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : i.optional ? (
                  <CircleSlash size={18} className="mt-0.5 shrink-0 text-muted-foreground/50" />
                ) : (
                  <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.configured ? 'Configured' : i.optional ? 'Not configured (optional)' : 'Not configured'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70 truncate" title={i.detail}>{i.detail}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h3 className="text-sm font-bold text-foreground">Cron Job Status</h3>
        <div className="flex items-center gap-2">
          {rateLimitHits24h !== null && (
            <div
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
              title="Requests blocked by the rate limiter in the last 24 hours, across every protected public route"
            >
              <Gauge size={12} />
              Rate-limit hits (24h): <span className="font-semibold text-foreground">{rateLimitHits24h}</span>
            </div>
          )}
          <button
            onClick={() => load()}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
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

      {/* Trend charts -- history over the selected `days` window, not just
          the single latest run/failure shown above. */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-foreground">Error Rate Trend</h3>
        {trend.dailyErrorCounts.length < 2 ? (
          <p className="text-sm text-muted-foreground">Not enough history yet for this range.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <Sparkline series={[{ label: 'Errors', color: '#dc2626', values: trend.dailyErrorCounts.map((d) => d.count) }]} />
            <p className="mt-2 text-xs text-muted-foreground">
              {trend.dailyErrorCounts[0].date} – {trend.dailyErrorCounts[trend.dailyErrorCounts.length - 1].date}
            </p>
          </div>
        )}
      </div>

      {Object.keys(trend.cronDayStatus).length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-foreground">Cron Uptime</h3>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            {Object.entries(trend.cronDayStatus).map(([route, dayStatuses]) => (
              <div key={route} className="flex items-center gap-3">
                <span className="w-48 shrink-0 truncate font-mono text-xs text-muted-foreground" title={route}>{route}</span>
                <div className="flex gap-1">
                  {dayStatuses.map((status, i) => (
                    <span
                      key={i}
                      title={status}
                      className={`h-3 w-3 rounded-sm ${DAY_STATUS_COLOR[status]}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h3 className="text-sm font-bold text-foreground">Recent Failures</h3>
        <div className="flex gap-2">
          <select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value as ResolvedFilter)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="unresolved">Unresolved</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
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
                <th className="p-3">Status</th>
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
                  <td className="p-3">
                    {ev.resolvedAt ? (
                      <span className="text-xs text-muted-foreground" title={ev.resolvedBy ?? undefined}>
                        Resolved {fmtDateTime(ev.resolvedAt)}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleResolve(ev.id)}
                        disabled={resolvingId === ev.id}
                        className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent disabled:opacity-50"
                      >
                        {resolvingId === ev.id
                          ? <Loader2 size={12} className="animate-spin" />
                          : <Check size={12} />}
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
