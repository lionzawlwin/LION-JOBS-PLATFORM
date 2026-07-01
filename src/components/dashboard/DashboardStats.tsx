import { Users, CalendarClock, UserCheck, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Candidate } from '@/types';

interface Props {
  candidates: Candidate[];
}

export function DashboardStats({ candidates }: Props) {
  const { t } = useLanguage();

  const STATS = [
    {
      label: t('ds_total_candidates'),
      icon: Users,
      color: 'text-brand-600',
      bg: 'bg-brand-50 dark:bg-brand-600/10',
      getValue: (c: Candidate[]) => c.length,
    },
    {
      label: t('ov_stage_applied'),
      icon: CalendarClock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      getValue: (c: Candidate[]) => c.filter((x) => x.stage === 'Applied').length,
    },
    {
      label: t('ds_in_progress'),
      icon: UserCheck,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      getValue: (c: Candidate[]) =>
        c.filter((x) => x.stage === 'Shortlisted' || x.stage === 'Interview').length,
    },
    {
      label: t('ov_stage_hired'),
      icon: Trophy,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      getValue: (c: Candidate[]) => c.filter((x) => x.stage === 'Hired').length,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {STATS.map(({ label, icon: Icon, color, bg, getValue }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', bg)}>
            <Icon size={20} className={color} />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{getValue(candidates)}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
