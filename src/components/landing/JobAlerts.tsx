'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { LION_LINKS } from '@/lib/deepLink';

const CATEGORIES = [
  'All Categories', 'Engineering', 'Design', 'Marketing', 'Sales',
  'Finance', 'Operations', 'Customer Service', 'Healthcare', 'Education', 'Other',
] as const;

const KEY = 'lion_alert_category';

function TelegramIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  );
}

export function JobAlerts() {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string>('All Categories');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      setSelected(saved);
      setSubscribed(true);
    }
  }, []);

  function handleSubscribe() {
    localStorage.setItem(KEY, selected);
    setSubscribed(true);
    window.open(LION_LINKS.telegramChannel.webUrl, '_blank', 'noopener,noreferrer');
  }

  function handleChange(cat: string) {
    setSelected(cat);
    if (subscribed) {
      localStorage.setItem(KEY, cat);
    }
  }

  return (
    <section className="border-t border-border bg-gradient-to-br from-brand-50 to-brand-100/40 py-14 dark:from-brand-600/5 dark:to-brand-600/10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">

          {/* Icon */}
          <div className={cn(
            'flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl',
            'bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-600/25',
          )}>
            {subscribed ? <BellRing size={26} /> : <Bell size={26} />}
          </div>

          {/* Text */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{t('alerts_title')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('alerts_sub')}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label htmlFor="alert-category" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('alerts_category')}
            </label>
            <select
              id="alert-category"
              value={selected}
              onChange={(e) => handleChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="sm:mt-6">
            <button
              type="button"
              onClick={handleSubscribe}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-colors sm:w-auto',
                subscribed
                  ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                  : 'bg-[#229ED9] hover:bg-[#1a8bbf] shadow-[#229ED9]/25',
              )}
            >
              <TelegramIcon />
              {subscribed ? (
                <>Channel Open <ExternalLink size={12} /></>
              ) : (
                t('alerts_subscribe')
              )}
            </button>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
          {subscribed
            ? `✓ Subscribed to ${selected} alerts via Telegram`
            : t('alerts_note')}
        </p>
      </div>
    </section>
  );
}
