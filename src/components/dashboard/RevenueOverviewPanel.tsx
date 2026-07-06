'use client';

import { Loader2, Wallet, Users2, Sparkles, Briefcase, Bell } from 'lucide-react';
import { useRevenueSummary } from '@/hooks/useRevenueSummary';

function mmk(n: number): string {
  return `${n.toLocaleString()} MMK`;
}

// Closes the loop on Plan Upgrades / Featured Placement / Job Boost: three
// separate revenue products shipped without any single view of how they're
// actually performing. Every figure here is a read-only aggregation of data
// that already exists for other reasons (see getRevenueSummary in
// src/lib/db/revenue.ts) -- this panel adds no new business logic.
export function RevenueOverviewPanel() {
  const { summary, loading } = useRevenueSummary();

  if (loading || !summary) {
    return <div className="mb-6 flex justify-center rounded-2xl border border-border bg-card p-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>;
  }

  const pendingTotal = summary.pendingRequests.planUpgrade + summary.pendingRequests.featuredPlacement + summary.pendingRequests.jobBoost + summary.pendingRequests.contactUnlock;

  const lines = [
    { label: 'Candidate Placements', value: summary.byLine.candidatePlacementMmk },
    { label: 'Plan Upgrades',        value: summary.byLine.planUpgradeMmk },
    { label: 'Featured Placements',  value: summary.byLine.featuredPlacementMmk },
    { label: 'Job Boosts',           value: summary.byLine.jobBoostMmk },
    { label: 'Contact Unlocks',      value: summary.byLine.contactUnlockMmk },
  ];

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
        <Wallet size={15} className="text-brand-600" /> Revenue Overview
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        All-time collected revenue (Paid invoices only), broken down by product line, plus what&apos;s currently live and awaiting your review.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-background p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Collected</p>
          <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-foreground tabular-nums">{mmk(summary.totalPaidMmk)}</p>
        </div>
        {lines.map((line) => (
          <div key={line.label} className="rounded-2xl border border-border bg-background p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{line.label}</p>
            <p className="mt-1.5 text-lg font-bold text-foreground tabular-nums">{mmk(line.value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><Users2 size={15} /></span>
          <div>
            <p className="text-sm font-bold text-foreground">{summary.activeFeaturedCompanies}</p>
            <p className="text-[11px] text-muted-foreground">Featured companies live now</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><Briefcase size={15} /></span>
          <div>
            <p className="text-sm font-bold text-foreground">{summary.activeBoostedJobs}</p>
            <p className="text-[11px] text-muted-foreground">Boosted jobs live now</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${pendingTotal > 0 ? 'border-brand-200 bg-brand-50 dark:border-brand-700/30 dark:bg-brand-600/10' : 'border-border bg-background'}`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white ${pendingTotal > 0 ? 'bg-brand-600' : 'bg-muted-foreground/40'}`}>
            {pendingTotal > 0 ? <Bell size={15} /> : <Sparkles size={15} />}
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">{pendingTotal}</p>
            <p className="text-[11px] text-muted-foreground">
              Pending requests{pendingTotal > 0 ? ' — see inboxes below' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
