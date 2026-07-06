'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Sparkles, Check, X, AlertTriangle } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import { useJobBoostSettings } from '@/hooks/useJobBoostSettings';
import type { SystemEvent } from '@/types';

function fmt(v: unknown): string {
  return v === null || v === undefined ? '—' : String(v);
}

// Mirrors FeaturedPlacementRequestsInbox.tsx exactly, one level down --
// per job posting instead of per company. Approving creates a Draft
// invoice; jobs.is_featured only flips on once that invoice is later
// marked Paid (see activateJobBoostIfInvoicePaid in src/lib/db/jobs.ts).
export function JobBoostRequestsInbox() {
  const [requests, setRequests] = useState<SystemEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [busyId, setBusyId]     = useState<string | null>(null);
  const { settings } = useJobBoostSettings();

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/job-boost-requests');
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
    const jobId = req.context?.jobId;
    const jobTitle = req.context?.jobTitle;
    if (!companyId || !companyName || !jobId || !jobTitle) return;

    setBusyId(req.id);
    try {
      const res = await fetch(`/api/job-boost-requests/${req.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, companyName, jobId, jobTitle }),
      });
      if (res.ok) setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDismiss(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/job-boost-requests/${id}/dismiss`, { method: 'POST' });
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
        <p className="text-sm text-muted-foreground">Couldn&apos;t load job boost requests.</p>
      </div>
    );
  }

  if (requests.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
        <Sparkles size={15} className="text-amber-500" /> Job Boost Requests ({requests.length})
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Employers who requested a boost for a specific job posting ({settings.priceMmk.toLocaleString()} MMK
        for {settings.durationDays} days — edit below). Approve to generate an invoice — the boost activates
        automatically once it&apos;s marked Paid, and expires on its own after the invoiced duration.
      </p>

      <ul className="flex flex-col gap-3">
        {requests.map((req) => (
          <li key={req.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{fmt(req.context?.jobTitle)}</p>
                <p className="text-xs text-muted-foreground">{fmt(req.context?.companyName)} · Requested {timeAgo(req.createdAt)}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(req)}
                  disabled={busyId === req.id}
                  className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
                >
                  {busyId === req.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Approve &amp; Invoice
                </button>
                <button
                  onClick={() => handleDismiss(req.id)}
                  disabled={busyId === req.id}
                  title="Dismiss without invoicing"
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
