'use client';

import { Users, Clock, Shield, TrendingUp, Star, Briefcase } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';

const WHY_US: {
  id: string;
  icon: typeof Users;
  color: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}[] = [
  { id: 'prescreened', icon: Users,      color: 'bg-brand-600',   titleKey: 'hire_page_why_prescreened_title', descKey: 'hire_page_why_prescreened_desc' },
  { id: 'turnaround',  icon: Clock,      color: 'bg-amber-500',   titleKey: 'hire_page_why_turnaround_title',  descKey: 'hire_page_why_turnaround_desc' },
  { id: 'quality',     icon: Shield,     color: 'bg-violet-600',  titleKey: 'hire_page_why_quality_title',     descKey: 'hire_page_why_quality_desc' },
  { id: 'expertise',   icon: TrendingUp, color: 'bg-emerald-600', titleKey: 'hire_page_why_expertise_title',   descKey: 'hire_page_why_expertise_desc' },
  { id: 'zerocost',    icon: Star,       color: 'bg-rose-500',    titleKey: 'hire_page_why_zerocost_title',    descKey: 'hire_page_why_zerocost_desc' },
  { id: 'e2e',         icon: Briefcase,  color: 'bg-sky-600',     titleKey: 'hire_page_why_e2e_title',         descKey: 'hire_page_why_e2e_desc' },
];

export function WhySection() {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-foreground">{t('hire_page_why_title')}</h2>
      <p className="mt-2 text-muted-foreground">
        {t('hire_page_why_desc')}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {WHY_US.map(({ id, icon: Icon, color, titleKey, descKey }) => (
          <div key={id} className="flex gap-3 rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{t(titleKey)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
