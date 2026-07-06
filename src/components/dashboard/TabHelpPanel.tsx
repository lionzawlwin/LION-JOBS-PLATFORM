'use client';

import { useState } from 'react';
import { Info, ChevronDown, ChevronRight, Lightbulb, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TabDomain } from '@/lib/permissions';
import { BANNER_KEYS, DASHBOARD_HELP } from '@/lib/dashboardHelp';

interface Props {
  tab: TabDomain;
  /** Labels for every tab the current role can see -- related-tab
   *  suggestions are filtered against this so a role without access to a
   *  tab is never offered a shortcut to it. */
  visibleTabLabels: Partial<Record<TabDomain, string>>;
  onNavigate: (tab: TabDomain) => void;
}

export function TabHelpPanel({ tab, visibleTabLabels, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  const help = DASHBOARD_HELP[tab];
  const related = help.related.filter((r) => visibleTabLabels[r.tab]);

  return (
    <div className="mb-6 rounded-xl border border-border bg-muted/40 text-xs text-muted-foreground">
      <div className="flex items-start gap-2 px-4 py-3">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span className="flex-1 pt-0.5">
          {t('admin_banner_prefix')}
          {t(BANNER_KEYS[tab])}
        </span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-semibold text-brand-600 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-600/10"
        >
          <Lightbulb size={12} />
          {open ? t('help_hide_tips') : t('help_show_tips')}
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
      </div>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <ul className="list-disc space-y-1 pl-4">
            {help.tipKeys.map((key) => <li key={key}>{t(key)}</li>)}
          </ul>

          {related.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {t('help_related_label')}
              </p>
              <div className="flex flex-wrap gap-2">
                {related.map((r) => (
                  <button
                    key={r.tab}
                    onClick={() => onNavigate(r.tab)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    {visibleTabLabels[r.tab]}
                    <ArrowRight size={10} className="text-muted-foreground" />
                    <span className="font-normal text-muted-foreground">{t(r.reasonKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
