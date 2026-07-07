'use client';

import { useState } from 'react';
import { BellPlus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { JobFilters } from '@/types';

// Job Alert Subscriptions (CTO big-upgrades roadmap, Item #2): lets a
// candidate save the *current* search (whatever's in JobFilters right
// now, including the hero search bar's keyword) and get a daily email
// when new jobs match it. Deliberately its own small popover rather than
// folded into JobFilters itself -- JobFilters only ever manages filter
// *state*, it doesn't know about network calls, and this needs to POST.
interface Props {
  filters: JobFilters;
}

export function SaveSearchButton({ filters }: Props) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const hasAnyCriteria = Boolean(
    filters.keyword || filters.category || filters.type || filters.location || filters.salaryMin,
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/job-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     email.trim().toLowerCase(),
          keyword:   filters.keyword || undefined,
          category:  filters.category || undefined,
          type:      filters.type || undefined,
          location:  filters.location || undefined,
          salaryMin: filters.salaryMin || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? t('save_search_error'));
      }
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('save_search_error'));
      setStatus('error');
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600"
      >
        <BellPlus size={13} />
        {t('save_search_btn')}
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border/60 bg-muted/30 p-4">
      {status === 'success' ? (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:border-green-700/30 dark:bg-green-900/20 dark:text-green-400">
          <Check size={16} className="shrink-0" />
          {t('save_search_success')}
        </div>
      ) : (
        <>
          <p className="mb-0.5 text-sm font-semibold text-foreground">{t('save_search_title')}</p>
          <p className="mb-3 text-xs text-muted-foreground">{t('save_search_sub')}</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('save_search_placeholder')}
              required
              disabled={status === 'loading'}
              className={cn('min-w-0 flex-1', !hasAnyCriteria && 'opacity-90')}
            />
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="shrink-0 bg-brand-600 text-white hover:bg-brand-700"
              >
                {status === 'loading' ? '…' : t('save_search_submit')}
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg border border-border/60 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>
          </form>
          {status === 'error' && errorMsg && (
            <p className="mt-1.5 text-xs text-red-500">{errorMsg}</p>
          )}
        </>
      )}
    </div>
  );
}
