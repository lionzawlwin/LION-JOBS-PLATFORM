'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, Mail, CheckCircle2, Users, Eye, EyeOff, AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import type { Company, CompanyStatus } from '@/types';

type EmailType = 'welcome' | 'outreach' | 'weekly_digest';

const STATUS_KEYS: Record<CompanyStatus, TranslationKey> = {
  Lead: 'status_lead', Active: 'status_active', 'In-Contract': 'status_in_contract', Inactive: 'status_inactive',
};

const EMAIL_TYPES: { value: EmailType; label: string; desc: string; emoji: string; subject: string; preview: string }[] = [
  {
    value:   'welcome',
    label:   'Welcome Email',
    desc:    'Send to new clients you just added to the CRM.',
    emoji:   '🎉',
    subject: 'Welcome to Lion Jobs Agency Partnership',
    preview: `Dear [Contact],\n\nThank you for partnering with Lion Jobs Agency — Myanmar's premier recruitment firm.\n\nWe are dedicated to connecting you with top-tier talent quickly and efficiently. Our team will be in touch shortly to understand your hiring needs.\n\n✅ Pre-screened candidates only\n✅ Fast placement turnaround\n✅ Dedicated account manager\n\nWe look forward to a successful partnership.\n\nBest regards,\nLion Jobs Agency Team`,
  },
  {
    value:   'outreach',
    label:   'Cold Outreach',
    desc:    'Introduce Lion Jobs to a company that doesn\'t know you yet.',
    emoji:   '🤝',
    subject: 'Recruitment Partnership Opportunity — Lion Jobs Agency',
    preview: `Dear [Contact],\n\nI hope this message finds you well.\n\nI'm reaching out from Lion Jobs Agency, Myanmar's leading recruitment firm. We specialise in connecting top talent with forward-thinking companies like [Company].\n\nWe currently have pre-vetted candidates available for a wide range of positions. Our service is free for the initial placement discussion — you only meet the best candidates.\n\nWould you be open to a brief call this week?\n\nBest regards,\nLion Jobs Agency`,
  },
  {
    value:   'weekly_digest',
    label:   'Weekly Job Digest',
    desc:    'Latest job openings and candidate count — great for engagement.',
    emoji:   '📋',
    subject: 'Weekly Job Market Update from Lion Jobs Agency',
    preview: `Dear [Contact],\n\nHere's your weekly update from Lion Jobs Agency:\n\n📊 This week's highlights:\n• New active job postings across multiple sectors\n• Freshly screened candidates in our talent pool\n• Growing companies hiring in Yangon & beyond\n\n🔗 Browse all open positions: lion-jobs-platform.vercel.app\n\nAs always, we're here to help [Company] find the right talent.\n\nBest regards,\nLion Jobs Agency Team`,
  },
];

const EMAIL_TYPE_LABEL_KEYS: Record<EmailType, TranslationKey> = {
  welcome: 'ec_label_welcome', outreach: 'ec_label_outreach', weekly_digest: 'ec_label_digest',
};
const EMAIL_TYPE_DESC_KEYS: Record<EmailType, TranslationKey> = {
  welcome: 'ec_desc_welcome', outreach: 'ec_desc_outreach', weekly_digest: 'ec_desc_digest',
};

export function EmailCampaigns() {
  const [companies,    setCompanies]    = useState<Company[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [configured,   setConfigured]   = useState<boolean | null>(null);
  const [emailType,    setEmailType]    = useState<EmailType>('welcome');
  const [selected,     setSelected]     = useState<Set<string>>(new Set());
  const [sending,      setSending]      = useState(false);
  const [results,      setResults]      = useState<{ name: string; ok: boolean; msg?: string }[]>([]);
  const [customNote,   setCustomNote]   = useState('');
  const [showPreview,  setShowPreview]  = useState(false);
  const [editedBody,   setEditedBody]   = useState(EMAIL_TYPES[0].preview);
  const { t } = useLanguage();

  // Reset editable body whenever template type changes
  useEffect(() => {
    const found = EMAIL_TYPES.find((e) => e.value === emailType);
    if (found) setEditedBody(found.preview);
  }, [emailType]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [coRes, statusRes] = await Promise.all([
        fetch('/api/companies'),
        fetch('/api/email/status'),
      ]);
      if (coRes.ok)     setCompanies(await coRes.json());
      if (statusRes.ok) setConfigured((await statusRes.json()).configured);
      else              setConfigured(false);
    } catch {
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const onRevalidate = () => load();
    window.addEventListener('companies:revalidate', onRevalidate);
    return () => window.removeEventListener('companies:revalidate', onRevalidate);
  }, [load]);

  const eligible    = companies.filter((c) => c.email && c.status !== 'Inactive');
  const activeType  = EMAIL_TYPES.find((e) => e.value === emailType)!;
  const successCount = results.filter((r) => r.ok).length;

  function toggleAll() {
    setSelected(selected.size === eligible.length ? new Set() : new Set(eligible.map((c) => c.id)));
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
    const out: { name: string; ok: boolean; msg?: string }[] = [];

    for (const co of targets) {
      try {
        const res = await fetch('/api/email/send', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type:       emailType,
            to:         co.email,
            customBody: editedBody,
            data: {
              contactPerson: co.contactPerson || co.name,
              companyName:   co.name,
              customNote:    emailType === 'outreach' ? (customNote || undefined) : undefined,
              jobs:           [],
              candidateCount: 0,
            },
          }),
        });
        const json = await res.json().catch(() => ({}));
        out.push({ name: co.name, ok: res.ok, msg: res.ok ? undefined : (json.error ?? 'Unknown error') });
      } catch (err) {
        out.push({ name: co.name, ok: false, msg: 'Network error' });
      }
    }

    setResults(out);
    setSending(false);
  }

  return (
    <div className="space-y-6">

      {/* ── Config warning ───────────────────────────────────────── */}
      {configured === false && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-700/30 dark:bg-amber-900/20">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-700 dark:text-amber-300">{t('ec_config_warning_title')}</p>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/70">
              {t('ec_config_warning_desc_prefix')}<code className="font-mono bg-amber-100 dark:bg-amber-900/30 px-1 rounded">RESEND_API_KEY</code>{t('ec_config_warning_desc_suffix')}
            </p>
          </div>
        </div>
      )}

      {/* ── Email Type Cards ─────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        {EMAIL_TYPES.map((et) => (
          <button
            key={et.value}
            onClick={() => { setEmailType(et.value); setResults([]); }}
            className={cn(
              'rounded-2xl border p-4 text-left transition-all',
              emailType === et.value
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-600/10 shadow-sm'
                : 'border-border hover:border-foreground/20',
            )}
          >
            <p className="text-lg">{et.emoji}</p>
            <p className={cn('mt-1 text-sm font-semibold', emailType === et.value ? 'text-brand-700 dark:text-brand-300' : 'text-foreground')}>{t(EMAIL_TYPE_LABEL_KEYS[et.value])}</p>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{t(EMAIL_TYPE_DESC_KEYS[et.value])}</p>
          </button>
        ))}
      </div>

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">

        {/* Left: options + recipients ──────────────────────────── */}
        <div className="space-y-4">

          {/* Custom note for outreach */}
          {emailType === 'outreach' && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('ec_custom_note_label')}</label>
              <textarea
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder={t('ec_custom_note_placeholder')}
                rows={3}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 resize-none transition-colors"
              />
            </div>
          )}

          {/* Recipients */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">{t('ec_recipients_label')}</span>
                {selected.size > 0 && (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">{selected.size}</span>
                )}
              </div>
              <button onClick={toggleAll} className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
                {selected.size === eligible.length && eligible.length > 0 ? t('ec_deselect_all') : t('ec_select_all')}
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            ) : eligible.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('ec_no_eligible')}</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {eligible.map((co) => (
                  <label key={co.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={selected.has(co.id)}
                      onChange={() => toggleOne(co.id)}
                      className="h-4 w-4 rounded border-border accent-brand-600"
                    />
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold">
                      {co.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{co.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{co.email}</p>
                    </div>
                    <span className={cn(
                      'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                      co.status === 'Active' || co.status === 'In-Contract'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700/30 dark:bg-blue-900/20 dark:text-blue-300',
                    )}>
                      {t(STATUS_KEYS[co.status] ?? 'status_lead')}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={sendCampaign}
            disabled={sending || selected.size === 0 || configured === false}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-lg shadow-brand-600/20"
          >
            {sending
              ? <><Loader2 size={15} className="animate-spin" /> {t('ec_sending_to')}{selected.size} {selected.size !== 1 ? t('ec_recipient_plural') : t('ec_recipient_singular')}…</>
              : <><Send size={15} /> {t('ec_send_prefix')}{activeType.emoji} {t(EMAIL_TYPE_LABEL_KEYS[activeType.value])}{t('ec_to_prefix')}{selected.size || 0}{t('ec_companies_suffix')}</>
            }
          </button>
        </div>

        {/* Right: Preview + Results ────────────────────────────── */}
        <div className="space-y-4">

          {/* Email preview — editable */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-xs font-bold text-foreground">{activeType.emoji} {t(EMAIL_TYPE_LABEL_KEYS[activeType.value])}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t('ec_subject_prefix')}{activeType.subject}</p>
              </div>
              <div className="flex items-center gap-2">
                {showPreview && editedBody !== activeType.preview && (
                  <button
                    onClick={() => setEditedBody(activeType.preview)}
                    className="flex items-center gap-1 rounded-xl border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    title={t('ec_reset_title')}
                  >
                    <RotateCcw size={11} /> {t('ec_reset')}
                  </button>
                )}
                <button
                  onClick={() => setShowPreview(v => !v)}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {showPreview ? <><EyeOff size={12} /> {t('ec_hide')}</> : <><Eye size={12} /> {t('ec_edit')}</>}
                </button>
              </div>
            </div>
            {showPreview && (
              <div className="p-3">
                <textarea
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={12}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs leading-relaxed text-foreground font-mono resize-y focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
                  placeholder={t('ec_edit_placeholder')}
                />
                <p className="mt-1.5 text-[10px] text-muted-foreground">{t('ec_edit_hint')}</p>
              </div>
            )}
            {!showPreview && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Eye size={14} />
                {t('ec_click_edit_hint')}
              </div>
            )}
          </div>

          {/* Campaign results */}
          {results.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span className="text-sm font-semibold text-foreground">{t('ec_campaign_complete')}</span>
                <span className="ml-auto text-xs font-medium text-muted-foreground">{successCount}/{results.length}{t('ec_sent_suffix')}</span>
              </div>

              <div className="max-h-40 divide-y divide-border overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-4 py-2">
                    <span className={cn('text-sm', r.ok ? 'text-emerald-500' : 'text-red-500')}>
                      {r.ok ? '✓' : '✗'}
                    </span>
                    <span className={cn('flex-1 text-xs', r.ok ? 'text-foreground' : 'text-red-600 dark:text-red-400')}>{r.name}</span>
                    {r.msg && <span className="text-[10px] text-muted-foreground">{r.msg}</span>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 pt-0">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 p-3 text-center">
                  <p className="text-2xl font-extrabold text-emerald-600">{successCount}</p>
                  <p className="text-xs text-muted-foreground">{t('ec_delivered')}</p>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-900/10 p-3 text-center">
                  <p className="text-2xl font-extrabold text-red-500">{results.length - successCount}</p>
                  <p className="text-xs text-muted-foreground">{t('ec_failed')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Refresh + info */}
          <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
            <div>
              <p><Mail size={11} className="inline mr-1" />{t('ec_powered_by_prefix')}<strong>Resend</strong>{t('ec_powered_by_suffix')}</p>
              <p className="mt-0.5">🕘{t('ec_digest_info_prefix')}<strong>Monday 9 AM</strong>{t('ec_digest_info_suffix')}</p>
            </div>
            <button onClick={load} className="shrink-0 rounded-lg border border-border p-1.5 hover:bg-accent transition-colors">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
