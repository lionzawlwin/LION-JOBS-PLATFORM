'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, History, Download, ShieldOff } from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { TabDomain } from '@/lib/permissions';
import type { AuditAction } from '@/types';

const DOMAIN_OPTIONS: Array<TabDomain | 'staff' | 'role-permissions'> = [
  'candidates', 'companies', 'enterprise', 'b2b-leads', 'legal',
  'billing', 'campaigns', 'post-job', 'manage-jobs', 'system-health',
  'staff', 'role-permissions',
];

const ACTION_OPTIONS: AuditAction[] = ['create', 'update', 'delete'];

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
  update: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  delete: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function ActivityLog() {
  const [domainFilter, setDomainFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { entries, loading, error, hasMore, loadMore, exportCsvUrl, exportRedactedCsvUrl } = useAuditLog({
    domain: domainFilter || undefined,
    action: (actionFilter || undefined) as AuditAction | undefined,
    actorEmail: actorFilter || undefined,
    q: q || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <History size={15} /> Audit Log
        </h3>
        <div className="flex gap-2">
          <a
            href={exportCsvUrl()}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <Download size={12} /> Export CSV
          </a>
          <a
            href={exportRedactedCsvUrl()}
            title="Actor identities replaced with role#n -- safe to share with an external party (e.g. enterprise procurement/security review)"
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <ShieldOff size={12} /> Export Redacted CSV
          </a>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All domains</option>
          {DOMAIN_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All actions</option>
          {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <input
          type="text"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
          placeholder="Actor email"
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search entity type/id"
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        />
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        />
      </div>

      {loading && entries.length === 0 ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <AlertTriangle size={28} className="text-red-500/60" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2">When</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Domain</th>
                <th className="pb-2">Entity</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="py-2 text-muted-foreground">{fmtDateTime(e.createdAt)}</td>
                  <td className="py-2 font-medium text-foreground">{e.actorEmail}</td>
                  <td className="py-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${ACTION_STYLES[e.action] ?? ''}`}>
                      {e.action}
                    </span>
                  </td>
                  <td className="py-2 text-muted-foreground">{e.domain}</td>
                  <td className="py-2 text-muted-foreground">{e.entityType} · {e.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-4 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
