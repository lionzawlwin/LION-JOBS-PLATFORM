'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, Mail, CheckCircle2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Company } from '@/types';

type EmailType = 'welcome' | 'outreach' | 'weekly_digest';

const EMAIL_TYPES: { value: EmailType; label: string; desc: string; emoji: string }[] = [
  { value: 'welcome',       label: 'Welcome Email',       desc: 'Send to new clients you just added to the CRM.',               emoji: '🎉' },
  { value: 'outreach',      label: 'Cold Outreach',       desc: 'Introduce Lion Jobs to a company that doesn\'t know you yet.',  emoji: '🤝' },
  { value: 'weekly_digest', label: 'Weekly Job Digest',   desc: 'Latest job openings and candidate count — great for engagement.', emoji: '📋' },
];

export function EmailCampaigns() {
  const [companies, setCompanies]   = useState<Company[]>([]);
  const [loading, setLoading]       = useState(true);
  const [emailType, setEmailType]   = useState<EmailType>('welcome');
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [sending, setSending]       = useState(false);
  const [results, setResults]       = useState<{ name: string; ok: boolean }[]>([]);
  const [customNote, setCustomNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (res.ok) setCompanies(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const eligible = companies.filter((c) => c.email && c.status !== 'Inactive');

  function toggleAll() {
    if (selected.size === eligible.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(eligible.map((c) => c.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function sendCampaign() {
    if (selected.size === 0) return;
    setSending(true);
    setResults([]);
    const targets = eligible.filter((c) => selected.has(c.id));
    const out: { name: string; ok: boolean }[] = [];

    for (const co of targets) {
      try {
        const res = await fetch('/api/email/send', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: emailType,
            to:   co.email,
            data: {
              contactPerson: co.contactPerson || co.name,
              companyName:   co.name,
              customNote:    customNote || undefined,
              // weekly_digest placeholders (real data would come from sheets)
              jobs:           [],
              candidateCount: 0,
            },
          }),
        });
        out.push({ name: co.name, ok: res.ok });
      } catch {
        out.push({ name: co.name, ok: false });
      }
    }

    setResults(out);
    setSending(false);
  }

  const successCount = results.filter((r) => r.ok).length;
  const activeType   = EMAIL_TYPES.find((e) => e.value === emailType)!;

  return (
    <div className="space-y-6">

      {/* Email type selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        {EMAIL_TYPES.map((et) => (
          <button
            key={et.value}
            onClick={() => setEmailType(et.value)}
            className={cn(
              'rounded-2xl border p-4 text-left transition-all',
              emailType === et.value
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-600/10'
                : 'border-border hover:border-foreground/30',
            )}
          >
            <p className="text-lg">{et.emoji}</p>
            <p className={cn('text-sm font-semibold', emailType === et.value ? 'text-brand-700 dark:text-brand-300' : 'text-foreground')}>{et.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{et.desc}</p>
          </button>
        ))}
      </div>

      {/* Custom note (for outreach) */}
      {emailType === 'outreach' && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom Opening Note (optional)</label>
          <textarea
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. We noticed your job posting for a Software Engineer and believe we can help…"
            rows={3}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
          />
        </div>
      )}

      {/* Company selector */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Select Recipients</span>
            {selected.size > 0 && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">{selected.size}</span>
            )}
          </div>
          <button
            onClick={toggleAll}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {selected.size === eligible.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        ) : eligible.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No active companies with email addresses yet.</div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {eligible.map((co) => (
              <label key={co.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                <input
                  type="checkbox"
                  checked={selected.has(co.id)}
                  onChange={() => toggleOne(co.id)}
                  className="h-4 w-4 rounded border-border accent-brand-600"
                />
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                    {co.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{co.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{co.email}</p>
                  </div>
                </div>
                <span className={cn(
                  'ml-auto shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold',
                  co.status === 'Client' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                                         : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300',
                )}>
                  {co.status}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Send button */}
      <button
        onClick={sendCampaign}
        disabled={sending || selected.size === 0}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-lg shadow-brand-600/20"
      >
        {sending
          ? <><Loader2 size={15} className="animate-spin" /> Sending to {selected.size} companies…</>
          : <><Send size={15} /> Send {activeType.emoji} {activeType.label} to {selected.size || 0} Companies</>
        }
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <p className="font-semibold text-foreground">Campaign Sent — {successCount}/{results.length} successful</p>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {results.map((r) => (
              <div key={r.name} className="flex items-center gap-2 text-xs">
                <span className={r.ok ? 'text-emerald-500' : 'text-danger'}>
                  {r.ok ? '✓' : '✗'}
                </span>
                <span className={r.ok ? 'text-foreground' : 'text-danger'}>{r.name}</span>
                {!r.ok && <span className="text-muted-foreground">(failed — check RESEND_API_KEY)</span>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{successCount}</p>
              <p className="text-xs text-muted-foreground">Delivered</p>
            </div>
            <div className="flex-1 rounded-xl bg-red-50 dark:bg-red-900/10 p-3 text-center">
              <p className="text-xl font-bold text-danger">{results.length - successCount}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <p><Mail size={12} className="inline mr-1" />Emails are sent via Resend (free tier: 3,000/month). Requires <code className="font-mono bg-muted px-1 rounded">RESEND_API_KEY</code> in Vercel environment variables.</p>
        <p className="mt-1">🕘 Weekly digest auto-sends every <strong>Monday at 9 AM</strong> to all active companies (Vercel Cron).</p>
      </div>
    </div>
  );
}
