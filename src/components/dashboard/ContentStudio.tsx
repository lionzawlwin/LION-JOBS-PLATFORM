'use client';

import { useState, useCallback } from 'react';
import {
  Copy, CheckCheck, RefreshCw, Send, Sparkles,
  Globe, MessageCircle, Briefcase, Hash, Clock, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import {
  generateContent,
  POST_TYPES,
  PLATFORMS,
  TONES,
  type PostType,
  type PostPlatform,
  type PostTone,
  type TemplateVars,
} from '@/lib/contentTemplates';

const POST_TYPE_KEYS: Record<PostType, TranslationKey> = {
  job_announcement: 'cs_posttype_job_announcement',
  urgent_hiring: 'cs_posttype_urgent_hiring',
  talent_pool_promo: 'cs_posttype_talent_pool_promo',
  company_spotlight: 'cs_posttype_company_spotlight',
  career_tip: 'cs_posttype_career_tip',
  employer_outreach: 'cs_posttype_employer_outreach',
};
const TONE_KEYS: Record<PostTone, TranslationKey> = {
  professional: 'cs_tone_professional',
  casual: 'cs_tone_casual',
  urgent: 'cs_tone_urgent',
};

// ── Platform char limits ──────────────────────────────────────────
const CHAR_LIMITS: Record<PostPlatform, number> = {
  facebook:  63206,
  telegram:  4096,
  whatsapp:  1000,
  linkedin:  3000,
};

const PLATFORM_ICONS: Record<PostPlatform, React.ReactNode> = {
  facebook:  <Globe         size={13} />,
  telegram:  <MessageCircle size={13} />,
  whatsapp:  <MessageCircle size={13} />,
  linkedin:  <Briefcase     size={13} />,
};

// ── Shared input class ────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground ' +
  'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors';

// ── Recent history entry ──────────────────────────────────────────
interface HistoryEntry { text: string; platform: PostPlatform; postType: PostType; ts: string }

export function ContentStudio() {
  const [postType, setPostType]   = useState<PostType>('job_announcement');
  const [platform, setPlatform]   = useState<PostPlatform>('facebook');
  const [tone,     setTone]       = useState<PostTone>('professional');
  const [content,  setContent]    = useState('');
  const [copied,   setCopied]     = useState(false);
  const [sending,  setSending]    = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [history,  setHistory]    = useState<HistoryEntry[]>([]);
  const { t } = useLanguage();

  const [vars, setVars] = useState<TemplateVars>({
    title: '', company: '', location: 'Yangon, Myanmar', salary: '',
    type: 'Full-time', category: '', applyUrl: '', phone: '09428954289',
    requirement1: '', requirement2: '', requirement3: '',
    tipTitle: '', tipBody: '', contactName: '', companyName: '',
  });

  const setVar = useCallback((key: keyof TemplateVars, val: string) => {
    setVars(v => ({ ...v, [key]: val }));
  }, []);

  const needsJob  = ['job_announcement', 'urgent_hiring', 'talent_pool_promo'].includes(postType);
  const needsTip  = postType === 'career_tip';
  const needsB2B  = ['company_spotlight', 'employer_outreach'].includes(postType);

  const charLimit = CHAR_LIMITS[platform];
  const charCount = content.length;
  const charPct   = Math.min(100, Math.round((charCount / charLimit) * 100));
  const overLimit = charCount > charLimit;

  function generate() {
    const result = generateContent(postType, platform, tone, vars);
    setContent(result);
    setSendResult(null);
    setCopied(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function sendToMake() {
    if (!content) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/content/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, platform, postType, tone }),
      });
      const json = await res.json();

      if (!res.ok) {
        setSendResult({ ok: false, msg: json.error ?? t('cs_msg_send_failed') });
      } else if (json.dev) {
        setSendResult({ ok: true, msg: t('cs_msg_dev_mode') });
      } else {
        setSendResult({ ok: true, msg: t('cs_msg_sent') });
        // Save to history
        setHistory(h => [
          { text: content, platform, postType, ts: new Date().toLocaleTimeString() },
          ...h.slice(0, 4),
        ]);
      }
    } catch {
      setSendResult({ ok: false, msg: t('cs_msg_network_error') });
    } finally {
      setSending(false);
    }
  }

  const activePostType = POST_TYPES.find(p => p.value === postType);

  return (
    <div className="space-y-6">

      {/* ── Top row: Post Type ────────────────────────────────────── */}
      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cs_post_type_label')}</label>
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => { setPostType(pt.value); setContent(''); setSendResult(null); }}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                postType === pt.value
                  ? 'border-brand-600 bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'border-border text-muted-foreground hover:border-brand-400 hover:text-foreground',
              )}
            >
              {pt.emoji} {t(POST_TYPE_KEYS[pt.value])}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main two-column ──────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">

        {/* Left: Controls ─────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Platform + Tone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cs_platform_label')}</label>
              <div className="flex flex-col gap-1.5">
                {PLATFORMS.map((pl) => (
                  <button
                    key={pl.value}
                    onClick={() => { setPlatform(pl.value); setContent(''); }}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                      platform === pl.value
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
                        : 'border-border text-muted-foreground hover:border-foreground/20',
                    )}
                  >
                    {PLATFORM_ICONS[pl.value as PostPlatform]}
                    {pl.label}
                    {platform === pl.value && (
                      <span className="ml-auto text-[10px] text-muted-foreground">{CHAR_LIMITS[pl.value as PostPlatform].toLocaleString()}{t('cs_chars_suffix')}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cs_tone_label')}</label>
              <div className="flex flex-col gap-1.5">
                {TONES.map((tn) => (
                  <button
                    key={tn.value}
                    onClick={() => { setTone(tn.value); setContent(''); }}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-xs font-semibold text-left transition-all',
                      tone === tn.value
                        ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
                        : 'border-border text-muted-foreground hover:border-foreground/20',
                    )}
                  >
                    {t(TONE_KEYS[tn.value])}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Variable fields */}
          <div className="space-y-2 rounded-2xl border border-border bg-muted/30 p-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {activePostType?.emoji} {t('cs_post_details_label')}
            </label>

            {needsJob && (
              <>
                <input placeholder={t('cs_ph_job_title')}        value={vars.title        ?? ''} onChange={e => setVar('title',        e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_company_name')}       value={vars.company      ?? ''} onChange={e => setVar('company',      e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_salary')} value={vars.salary ?? ''} onChange={e => setVar('salary',   e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_location')}           value={vars.location     ?? ''} onChange={e => setVar('location',     e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_requirement1')}  value={vars.requirement1 ?? ''} onChange={e => setVar('requirement1', e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_requirement2')}  value={vars.requirement2 ?? ''} onChange={e => setVar('requirement2', e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_category')} value={vars.category ?? ''} onChange={e => setVar('category', e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_apply_url')} value={vars.applyUrl  ?? ''} onChange={e => setVar('applyUrl',     e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_phone')}   value={vars.phone       ?? ''} onChange={e => setVar('phone',        e.target.value)} className={inputCls} />
              </>
            )}
            {needsTip && (
              <>
                <input placeholder={t('cs_ph_tip_title')}  value={vars.tipTitle ?? ''} onChange={e => setVar('tipTitle', e.target.value)} className={inputCls} />
                <textarea placeholder={t('cs_ph_tip_body')} value={vars.tipBody  ?? ''} onChange={e => setVar('tipBody',  e.target.value)} rows={3} className={cn(inputCls, 'resize-none')} />
              </>
            )}
            {needsB2B && (
              <>
                <input placeholder={t('cs_ph_company_name_required')}  value={vars.companyName ?? ''} onChange={e => setVar('companyName',  e.target.value)} className={inputCls} />
                <input placeholder={t('cs_ph_contact_person')}  value={vars.contactName ?? ''} onChange={e => setVar('contactName',  e.target.value)} className={inputCls} />
              </>
            )}
            {!needsJob && !needsTip && !needsB2B && (
              <p className="text-xs text-muted-foreground py-2">{t('cs_no_extra_fields')}</p>
            )}
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/25"
          >
            <Sparkles size={16} /> {t('cs_generate_btn')}{activePostType?.emoji} {activePostType && t(POST_TYPE_KEYS[activePostType.value])}
          </button>

        </div>

        {/* Right: Output ─────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Char counter + platform badge */}
          {content ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold">
                    {PLATFORM_ICONS[platform]}
                    {PLATFORMS.find(p => p.value === platform)?.label}
                  </span>
                  <span className={cn(
                    'text-xs font-mono font-semibold',
                    overLimit ? 'text-red-600' : charPct > 80 ? 'text-amber-600' : 'text-muted-foreground',
                  )}>
                    {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setContent(''); setSendResult(null); }} className="rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Trash2 size={13} />
                  </button>
                  <button onClick={generate} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw size={12} /> {t('cs_regenerate')}
                  </button>
                </div>
              </div>

              {/* Char progress bar */}
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-300', overLimit ? 'bg-red-500' : charPct > 80 ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.min(charPct, 100)}%` }}
                />
              </div>

              {/* Output textarea */}
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={16}
                className={cn(
                  'w-full resize-y rounded-2xl border bg-background p-4 font-mono text-sm leading-relaxed text-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-brand-600/40 transition-colors',
                  overLimit ? 'border-red-400' : 'border-border',
                )}
              />

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyToClipboard}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition-all',
                    copied
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {copied ? <><CheckCheck size={15} /> {t('cs_copied')}</> : <><Copy size={15} /> {t('cs_copy')}</>}
                </button>
                <button
                  onClick={sendToMake}
                  disabled={sending || overLimit}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all',
                    'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/20',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                  )}
                >
                  {sending ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                  {sending ? t('cs_sending') : t('cs_send_to_make')}
                </button>
              </div>

              {/* Send result */}
              {sendResult && (
                <div className={cn(
                  'rounded-xl border px-4 py-3 text-xs font-medium',
                  sendResult.ok
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-red-200 bg-red-50 text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400',
                )}>
                  {sendResult.ok ? '✓ ' : '✗ '}{sendResult.msg}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600/10 text-brand-600">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{t('cs_empty_title')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('cs_empty_sub')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Post History ─────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">{t('cs_history_title')}</span>
          </div>
          <div className="divide-y divide-border">
            {history.map((h, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground mt-0.5">
                  {PLATFORM_ICONS[h.platform]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-foreground font-medium">{h.text.split('\n')[0]}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t(POST_TYPE_KEYS[h.postType])} · {h.platform} · {h.ts}</p>
                </div>
                <button
                  onClick={() => setContent(h.text)}
                  className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  {t('cs_load_btn')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <p><Hash size={11} className="inline mr-1" />{t('cs_footer_prefix')}<strong>Make.com</strong>{t('cs_footer_suffix')}<code className="font-mono bg-muted px-1 rounded">MAKE_PUBLISH_WEBHOOK_URL</code>{t('cs_footer_suffix2')}</p>
      </div>
    </div>
  );
}
