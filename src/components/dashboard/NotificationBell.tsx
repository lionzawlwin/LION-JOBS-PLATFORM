'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n';
import type { NotificationTargetTab, NotificationType } from '@/types';

const TYPE_LABEL_KEY: Record<NotificationType, TranslationKey> = {
  job_request:        'nb_job_request',
  system_event:       'nb_system_alert',
  unclaimed_lead:     'nb_unclaimed_lead',
  contract_expiring:  'nb_contract_expiring',
};

interface Props {
  onNavigate: (tab: NotificationTargetTab) => void;
}

export function NotificationBell({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { items, totalCount, loading } = useNotifications();
  const { t } = useLanguage();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={t('nb_title')}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell size={16} />
        {totalCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-2xl border border-border bg-card p-3 shadow-2xl">
          <h3 className="mb-2 px-1 text-sm font-bold text-foreground">{t('nb_title')}</h3>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>
          ) : items.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted-foreground">{t('nb_empty')}</p>
          ) : (
            <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => { onNavigate(item.href); setOpen(false); }}
                    className="flex w-full flex-col gap-0.5 rounded-xl px-2 py-2 text-left hover:bg-muted"
                  >
                    <span className={cn('text-[10px] font-semibold uppercase tracking-wide text-muted-foreground')}>
                      {t(TYPE_LABEL_KEY[item.type])}
                    </span>
                    <span className="text-sm font-medium text-foreground">{item.title}</span>
                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
