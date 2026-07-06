'use client';

import { useState } from 'react';
import { Loader2, Pencil, Check, X, Sparkles } from 'lucide-react';
import { useJobBoostSettings } from '@/hooks/useJobBoostSettings';

// Mirrors FeaturedPlacementSettingsPanel.tsx exactly, one price point
// over -- Job Boost is priced and durationed independently from Featured
// Company Placement.
export function JobBoostSettingsPanel() {
  const { settings, loading, mutate } = useJobBoostSettings();
  const [editing, setEditing]   = useState(false);
  const [draftPrice, setDraftPrice]       = useState('');
  const [draftDuration, setDraftDuration] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  function startEdit() {
    setDraftPrice(String(settings.priceMmk));
    setDraftDuration(String(settings.durationDays));
    setError('');
    setEditing(true);
  }

  async function save() {
    const priceMmk     = Number(draftPrice);
    const durationDays = Number(draftDuration);
    if (!Number.isFinite(priceMmk) || priceMmk < 0) {
      setError('Price must be a non-negative number.');
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays < 1) {
      setError('Duration must be a whole number of days, at least 1.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/job-boost-settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priceMmk, durationDays }),
      });
      if (res.ok) {
        setEditing(false);
        await mutate();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Could not save. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="mb-6 flex justify-center rounded-2xl border border-border bg-card p-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
        <Sparkles size={15} className="text-amber-500" /> Job Boost Pricing
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        What employers see and pay when they boost an individual job posting from their portal. Changing this
        never affects boosts already invoiced or active — only new requests approved after the change.
      </p>

      {editing ? (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Price (MMK)</label>
            <input
              type="number"
              min="0"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.target.value)}
              autoFocus
              className="w-32 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-foreground">Duration (days)</label>
            <input
              type="number"
              min="1"
              value={draftDuration}
              onChange={(e) => setDraftDuration(e.target.value)}
              className="w-24 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
            title="Save"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          </button>
          <button
            onClick={() => setEditing(false)}
            disabled={saving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent"
            title="Cancel"
          >
            <X size={13} />
          </button>
          {error && <p className="w-full text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="flex items-center gap-1.5 text-sm font-bold text-foreground hover:text-brand-600"
        >
          {settings.priceMmk.toLocaleString()} MMK for {settings.durationDays} days
          <Pencil size={12} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
