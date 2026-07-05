'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle, History } from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { TabDomain } from '@/lib/permissions';

const DOMAIN_OPTIONS: Array<TabDomain | 'staff' | 'role-permissions'> = [
  'candidates', 'companies', 'enterprise', 'b2b-leads', 'legal',
  'billing', 'campaigns', 'post-job', 'manage-jobs', 'system-health',
  'staff', 'role-permissions',
];

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
  const { entries, loading, error } = useAuditLog(domainFilter || undefined);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <History size={15} /> Activity
        </h3>
        <select
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
        >
          <option value="">All domains</option>
          {DOMAIN_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
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
    </div>
  );
}
