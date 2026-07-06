'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAccountPlans, usePlanUsageSummary } from '@/hooks/usePlanUsage';
import { Loader2, Pencil, Check, X } from 'lucide-react';

// Layer 13 (Plan Tiers & Usage Metering). Lives inside the Billing tab
// rather than a new top-level tab -- no new TabDomain, RBAC matrix row, or
// Sidebar entry needed for this pass (see roadmap Layer 13 commit notes).
//
// Pricing editor (added post-launch, per repo owner's explicit request):
// price_mmk is a plain column on account_plans, edited here via
// PATCH /api/account-plans/[id] -- changing a price is a data write, never
// a code change or redeploy. Job-slot limits/CSE hours stay read-only in
// this UI for now; only price needed to be owner-editable at launch.
function PricingEditor() {
  const { plans, mutate } = useAccountPlans();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPrice, setDraftPrice] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit(planId: string, currentPrice: number | null) {
    setEditingId(planId);
    setDraftPrice(String(currentPrice ?? 0));
  }

  async function save(planId: string) {
    const priceMmk = Number(draftPrice);
    if (!Number.isFinite(priceMmk) || priceMmk < 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/account-plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceMmk }),
      });
      if (res.ok) {
        setEditingId(null);
        await mutate();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-3">
      {plans.map((p) => (
        <div key={p.id} className="rounded-xl border border-border bg-background p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">{p.name}</span>
            <span className="text-xs text-muted-foreground">{p.jobSlotLimit ?? '∞'} slots</span>
          </div>
          {editingId === p.id ? (
            <div className="mt-2 flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={draftPrice}
                onChange={(e) => setDraftPrice(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              <span className="text-xs text-muted-foreground">MMK</span>
              <button
                onClick={() => save(p.id)}
                disabled={saving}
                title="Save"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              </button>
              <button
                onClick={() => setEditingId(null)}
                title="Cancel"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => startEdit(p.id, p.priceMmk)}
              className="mt-2 flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-brand-600"
            >
              {(p.priceMmk ?? 0).toLocaleString()} MMK/mo <Pencil size={11} className="text-muted-foreground" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

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
      <PricingEditor />
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
                      {p.name} ({p.jobSlotLimit ?? '∞'} slots · {(p.priceMmk ?? 0).toLocaleString()} MMK/mo)
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
