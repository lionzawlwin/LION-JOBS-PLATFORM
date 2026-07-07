'use client';

import { useState } from 'react';
import { Loader2, Pencil, Check, X, Phone } from 'lucide-react';
import { useContactUnlockSettings } from '@/hooks/useContactUnlockSettings';

// Mirrors JobBoostSettingsPanel.tsx -- one price point, no duration field
// since a contact unlock doesn't expire.
export function ContactUnlockSettingsPanel() {
  const { settings, loading, mutate } = useContactUnlockSettings();
  const [editing, setEditing]   = useState(false);
  const [draftPrice, setDraftPrice] = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  function startEdit() {
    setDraftPrice(String(settings.priceMmk));
    setError('');
    setEditing(true);
  }

  async function save() {
    const priceMmk = Number(draftPrice);
    if (!Number.isFinite(priceMmk) || priceMmk < 0) {
      setError('Price must be a non-negative number.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/contact-unlock-settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ priceMmk }),
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
        <Phone size={15} className="text-brand-600" /> Direct Contact Unlock Pricing
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        What employers pay to unlock one applicant&apos;s direct phone/email, once the candidate has opted in.
        Changing this never affects unlocks already invoiced or paid — only new requests approved after the change.
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
          {settings.priceMmk.toLocaleString()} MMK per unlock
          <Pencil size={12} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
