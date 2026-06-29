'use client';

import { useState } from 'react';
import { Copy, CheckCheck, RefreshCw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
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

const MAKE_PUBLISH_URL = process.env.NEXT_PUBLIC_MAKE_PUBLISH_URL;

export function ContentStudio() {
  const [postType,   setPostType]   = useState<PostType>('job_announcement');
  const [platform,   setPlatform]   = useState<PostPlatform>('facebook');
  const [tone,       setTone]       = useState<PostTone>('professional');
  const [content,    setContent]    = useState('');
  const [copied,     setCopied]     = useState(false);
  const [sending,    setSending]    = useState(false);
  const [sentOk,     setSentOk]     = useState(false);

  // Template vars — user fills in per-post details
  const [vars, setVars] = useState<TemplateVars>({
    title:       '',
    company:     '',
    location:    'Yangon, Myanmar',
    salary:      '',
    type:        'Full-time',
    category:    '',
    requirement1: '',
    requirement2: '',
    requirement3: '',
    tipTitle:    '',
    tipBody:     '',
    contactName: '',
    companyName: '',
  });

  const needsJobFields  = ['job_announcement', 'urgent_hiring'].includes(postType);
  const needsTipFields  = postType === 'career_tip';
  const needsB2BFields  = ['company_spotlight', 'employer_outreach'].includes(postType);

  function generate() {
    setContent(generateContent(postType, platform, tone, vars));
    setSentOk(false);
    setCopied(false);
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function sendToMake() {
    if (!MAKE_PUBLISH_URL) { alert('NEXT_PUBLIC_MAKE_PUBLISH_URL is not set.'); return; }
    setSending(true);
    try {
      await fetch(MAKE_PUBLISH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, platform, postType }),
      });
      setSentOk(true);
    } catch {
      alert('Failed to send to Make.com');
    } finally {
      setSending(false);
    }
  }

  const activePostType = POST_TYPES.find((p) => p.value === postType);

  return (
    <div className="space-y-6">
      {/* Controls row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Post type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Post Type</label>
          <div className="grid grid-cols-2 gap-1.5">
            {POST_TYPES.map((pt) => (
              <button
                key={pt.value}
                onClick={() => { setPostType(pt.value); setContent(''); }}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all text-left',
                  postType === pt.value
                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
                    : 'border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground',
                )}
              >
                {pt.emoji} {pt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Platform + Tone */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Platform</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((pl) => (
                <button
                  key={pl.value}
                  onClick={() => { setPlatform(pl.value); setContent(''); }}
                  className={cn(
                    'rounded-xl border px-3 py-1.5 text-xs font-medium transition-all',
                    platform === pl.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
                      : 'border-border text-muted-foreground hover:border-foreground/30',
                  )}
                >
                  {pl.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tone</label>
            <div className="flex flex-col gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setTone(t.value); setContent(''); }}
                  className={cn(
                    'rounded-xl border px-3 py-1.5 text-xs font-medium text-left transition-all',
                    tone === t.value
                      ? 'border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
                      : 'border-border text-muted-foreground hover:border-foreground/30',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Variable fields */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {activePostType?.emoji} Post Details
          </label>
          <div className="space-y-2">
            {needsJobFields && (
              <>
                <input placeholder="Job Title *"      value={vars.title       ?? ''} onChange={(e) => setVars({ ...vars, title:       e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <input placeholder="Company Name"     value={vars.company     ?? ''} onChange={(e) => setVars({ ...vars, company:     e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <input placeholder="Salary (e.g. 500K–800K MMK)" value={vars.salary ?? ''} onChange={(e) => setVars({ ...vars, salary: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <input placeholder="Location"         value={vars.location    ?? ''} onChange={(e) => setVars({ ...vars, location:    e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <input placeholder="Requirement 1"    value={vars.requirement1 ?? ''} onChange={(e) => setVars({ ...vars, requirement1: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <input placeholder="Requirement 2"    value={vars.requirement2 ?? ''} onChange={(e) => setVars({ ...vars, requirement2: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <input placeholder="Category (hashtag)" value={vars.category ?? ''} onChange={(e) => setVars({ ...vars, category: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
              </>
            )}
            {needsTipFields && (
              <>
                <input placeholder="Tip Title *"   value={vars.tipTitle ?? ''} onChange={(e) => setVars({ ...vars, tipTitle: e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <textarea placeholder="Tip body…" value={vars.tipBody ?? ''} onChange={(e) => setVars({ ...vars, tipBody: e.target.value })} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600 resize-none" />
              </>
            )}
            {needsB2BFields && (
              <>
                <input placeholder="Company Name *"    value={vars.companyName  ?? ''} onChange={(e) => setVars({ ...vars, companyName:  e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
                <input placeholder="Contact Person"    value={vars.contactName  ?? ''} onChange={(e) => setVars({ ...vars, contactName:  e.target.value })} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-600" />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
      >
        <RefreshCw size={15} /> Generate {activePostType?.emoji} {activePostType?.label} Post
      </button>

      {/* Output */}
      {content && (
        <div className="space-y-3">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Generated Post — Edit before publishing</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={14}
            className="w-full rounded-2xl border border-border bg-background p-4 text-sm text-foreground font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-600 resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium transition-all',
                copied
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              {copied ? <><CheckCheck size={14} /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
            </button>
            <button
              onClick={sendToMake}
              disabled={sending || sentOk}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all',
                sentOk
                  ? 'bg-emerald-500 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-60',
              )}
            >
              {sentOk
                ? '✓ Sent to Make.com'
                : sending
                  ? 'Sending…'
                  : <><Send size={14} /> Send to Make.com</>
              }
            </button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Make.com will distribute this post across your connected channels (Facebook, Telegram, etc.)
          </p>
        </div>
      )}
    </div>
  );
}
