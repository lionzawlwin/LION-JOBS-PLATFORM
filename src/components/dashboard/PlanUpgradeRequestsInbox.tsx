'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, ArrowUpCircle, Check, X, AlertTriangle } from 'lucide-react';
import { useAccountPlans } from '@/hooks/usePlanUsage';
import { timeAgo } from '@/lib/utils';
import type { SystemEvent } from '@/types';

function fmt(v: unknown): string {
  return v === null || v === undefined ? '—' : String(v);
}

export function PlanUpgradeRequestsInbox() {
  const [requests, setRequests] = useState<SystemEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [selectedPlanByRequest, setSelectedPlanByRequest] = useState<Record<string, string>>({});
  const [busyId, setBusyId]     = useState<string | null>(null);
  const { plans } = useAccountPlans();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/plan-upgrade-requests');
      if (!res.ok) { setError(true); return; }
      setRequests(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(req: SystemEvent) {
    const companyId = req.context?.companyId;
    const companyName = req.context?.companyName;
    const planId = selectedPlanByRequest[req.id];
    if (!companyId || !companyName || !planId) return;

    setBusyId(req.id);
    try {
      const res = await fetch(`/api/plan-upgrade-requests/${req.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, companyName, planId }),
      });
      if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/plan-upgrade-requests/${id}/dismiss`, { method: 'POST' });
      if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="mb-6 flex justify-center rounded-2xl border border-border bg-card p-8">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center">
        <AlertTriangle size={20} className="text-red-500/60" />
        <p className="text-sm text-muted-foreground">Couldn&apos;t load plan upgrade requests.</p>
      </div>
    );
  }

  if (requests.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
        <ArrowUpCircle size={15} className="text-brand-600" /> Plan Upgrade Requests ({requests.length})
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Employers who requested more job slots or a plan upgrade from their portal. Pick a plan and approve to
        assign it and generate an invoice in one step.
      </p>

      <ul className="flex flex-col gap-3">
        {requests.map((req) => (
          <li key={req.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{fmt(req.context?.companyName)}</p>
                <p className="text-xs text-muted-foreground">
                  Current plan: {fmt(req.context?.currentPlan)} · {fmt(req.context?.jobSlotsUsed)}
                  {req.context?.jobSlotLimit !== null && req.context?.jobSlotLimit !== undefined ? ` / ${req.context.jobSlotLimit}` : ''} slots used
                </p>
                <p className="text-xs text-muted-foreground">Requested {timeAgo(req.createdAt)}</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedPlanByRequest[req.id] ?? ''}
                  onChange={(e) => setSelectedPlanByRequest((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="">Select new plan…</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.jobSlotLimit ?? '∞'} slots · {(p.priceMmk ?? 0).toLocaleString()} MMK/mo)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={busyId === req.id || !selectedPlanByRequest[req.id]}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                >
                  {busyId === req.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Approve &amp; Invoice
                </button>
                <button
                  onClick={() => handleDismiss(req.id)}
                  disabled={busyId === req.id}
                  title="Dismiss without assigning a plan"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
