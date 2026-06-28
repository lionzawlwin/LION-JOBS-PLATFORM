import { Users, CalendarClock, UserCheck, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Candidate } from '@/types';

interface Props {
  candidates: Candidate[];
}

const STATS = [
  {
    label: 'Total Candidates',
    icon: Users,
    color: 'text-brand-600',
    bg: 'bg-brand-50 dark:bg-brand-600/10',
    getValue: (c: Candidate[]) => c.length,
  },
  {
    label: 'Applied',
    icon: CalendarClock,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    getValue: (c: Candidate[]) => c.filter((x) => x.stage === 'Applied').length,
  },
  {
    label: 'In Progress',
    icon: UserCheck,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    getValue: (c: Candidate[]) =>
      c.filter((x) => x.stage === 'Shortlisted' || x.stage === 'Interview').length,
  },
  {
    label: 'Hired',
    icon: Trophy,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-900/20',
    getValue: (c: Candidate[]) => c.filter((x) => x.stage === 'Hired').length,
  },
];

export function DashboardStats({ candidates }: Props) {
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
