'use client';

import { Loader2, AlertTriangle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCsePerformance } from '@/hooks/useCsePerformance';

export function CsePerformanceTable() {
  const { rows, loading, error } = useCsePerformance();

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-border">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400">
        <AlertTriangle size={16} />
        Failed to load team performance.
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
        <Trophy size={14} className="text-muted-foreground" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Team Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-2">CSE</th>
              <th className="px-4 py-2">Active Contracts</th>
              <th className="px-4 py-2">Contract Value</th>
              <th className="px-4 py-2">Companies</th>
              <th className="px-4 py-2">Leads Claimed</th>
              <th className="px-4 py-2">At Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.cseRepId}>
                <td className="px-4 py-2.5 font-medium text-foreground">{r.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.activeContractsCount}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.activeContractValue.toLocaleString()} MMK</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.assignedCompaniesCount}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{r.claimedLeadsCount}</td>
                <td className={cn('px-4 py-2.5 font-semibold', r.atRiskAccountsCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                  {r.atRiskAccountsCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
