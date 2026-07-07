'use client';

import { useState } from 'react';
import { Loader2, Mail, Send, CheckCircle2 } from 'lucide-react';
import { useOptInCampaign } from '@/hooks/useOptInCampaign';

// Fast-Track Visibility opt-in campaign (2026-07-07): a one-time backfill
// for candidates who applied before the Direct-Contact-Info Upsell
// Tier's consent checkbox existed. Manual "Send next batch" button, not
// automatic -- lets the owner review/pace it, and avoids a new cron this
// repo's Vercel Hobby plan has no slot for anyway.
export function OptInCampaignPanel() {
  const { stats, loading, mutate } = useOptInCampaign();
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number } | null>(null);

  async function handleSendBatch() {
    setSending(true);
    setLastResult(null);
    try {
      const res = await fetch('/api/opt-in-campaign/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 25 }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastResult({ sent: data.sent, failed: data.failed });
        await mutate();
      }
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="mb-6 flex justify-center rounded-2xl border border-border bg-card p-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-bold text-foreground">
        <Mail size={15} className="text-brand-600" /> Fast-Track Visibility Opt-In Campaign
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        One-time email to historical candidates (applied before Direct Contact Unlock existed) with a one-click
        link to opt in. Sends in batches of 25 so it stays reviewable — click again for the next batch. Actual
        delivery depends on the Resend sending domain being verified (see PROGRESS.md if unsure).
      </p>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-lg font-bold text-foreground tabular-nums">{stats.eligible}</p>
          <p className="text-[11px] text-muted-foreground">Eligible (not yet emailed)</p>
        </div>
        <div className="rounded-xl border border-border bg-background px-3 py-2">
          <p className="text-lg font-bold text-foreground tabular-nums">{stats.sent}</p>
          <p className="text-[11px] text-muted-foreground">Already emailed</p>
        </div>
      </div>

      <button
        onClick={handleSendBatch}
        disabled={sending || stats.eligible === 0}
        className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
      >
        {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        {stats.eligible === 0 ? 'All eligible candidates emailed' : 'Send next batch (25)'}
      </button>

      {lastResult && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} /> Sent {lastResult.sent}{lastResult.failed > 0 ? `, ${lastResult.failed} failed (see System Health)` : ''}.
        </p>
      )}
    </div>
  );
}
