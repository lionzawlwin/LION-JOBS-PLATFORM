'use client';

import { cn } from '@/lib/utils';
import { useAccountPlans, usePlanUsageSummary } from '@/hooks/usePlanUsage';
import { Loader2 } from 'lucide-react';

// Layer 13 (Plan Tiers & Usage Metering). Lives inside the Billing tab
// rather than a new top-level tab -- no new TabDomain, RBAC matrix row, or
// Sidebar entry needed for this pass (see roadmap Layer 13 commit notes).
export function AccountPlansPanel() {
  const { plans } = useAccountPlans();
  const { rows, loading, mutate } = usePlanUsageSummary();

  async function assignPlan(companyId: string, planId: string) {
    await fetch(`/api/companies/${companyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: planId || null }),
    });
    await mutate();
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-1 text-sm font-bold text-foreground">Account Plans &amp; Usage</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Job-slot usage against each account&apos;s assigned plan. Unassigned accounts are unmetered.
      </p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No external accounts yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.companyId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-2.5 text-sm"
            >
              <span className="font-medium text-foreground">{row.companyName}</span>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-semibold',
                    row.atCapacity ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
                  )}
                >
                  {row.jobSlotsUsed}{row.jobSlotLimit !== null ? ` / ${row.jobSlotLimit}` : ''} slots
                  {row.atCapacity && ' · at capacity'}
                </span>
                <select
                  value={row.planId ?? ''}
                  onChange={(e) => assignPlan(row.companyId, e.target.value)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="">No plan (unmetered)</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.jobSlotLimit ?? '∞'} slots)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
