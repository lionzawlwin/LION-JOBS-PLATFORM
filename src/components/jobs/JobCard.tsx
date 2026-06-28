import Link from 'next/link';
import { MapPin, Clock, Zap, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn, formatSalary, timeAgo, truncate } from '@/lib/utils';
import type { Job } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  'Full-time': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Part-time': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Contract': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Remote': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Hybrid': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function JobCard({ job }: { job: Job }) {
  return (
    <article className={cn(
      // Glassmorphism base — translucent so the Myanmar body pattern shows through
      'group relative flex flex-col gap-4 rounded-2xl p-6 transition-all duration-300',
      'glass-card',
      'hover:shadow-2xl hover:shadow-brand-600/10 hover:-translate-y-1 hover:border-white/80 dark:hover:border-white/15',
      job.isFeatured && 'ring-2 ring-gold-500/30 !border-gold-400/40 dark:ring-gold-500/20',
    )}>

      {/* Top row: badges + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {job.isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <Zap size={10} /> Urgent
            </span>
          )}
          {job.isFeatured && (
            <span className="inline-flex items-center rounded-full bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-gold-700 dark:bg-gold-600/10 dark:text-gold-400">
              ⭐ Featured
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(job.postedAt)}</span>
      </div>

      {/* Title + Company */}
      <div>
        <h3 className="text-base font-bold text-foreground group-hover:text-brand-600 transition-colors leading-snug">
          {job.title}
        </h3>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{job.company}</p>
      </div>

      {/* Meta chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <MapPin size={12} className="text-brand-600" /> {job.location}
        </span>
        <span className={cn('rounded-full px-2.5 py-0.5 font-semibold flex items-center gap-1', TYPE_COLORS[job.type] ?? 'bg-muted text-muted-foreground')}>
          <Clock size={10} /> {job.type}
        </span>
        <Badge variant="secondary" className="text-xs font-medium">{job.category}</Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {truncate(job.description, 130)}
      </p>

      {/* Requirements */}
      {job.requirements.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.requirements.slice(0, 3).map((req) => (
            <span key={req} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {req}
            </span>
          ))}
          {job.requirements.length > 3 && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              +{job.requirements.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Salary + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        <div>
          <div className="flex items-center gap-1 text-sm font-bold text-foreground">
            <DollarSign size={13} className="text-brand-600" />
            {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
          </div>
          <p className="text-xs text-muted-foreground">per month</p>
        </div>
        <Link
          href={`/apply/${job.id}`}
          className={cn(
            buttonVariants({ size: 'sm' }),
            'bg-brand-600 hover:bg-brand-700 text-white shrink-0 rounded-xl font-semibold',
          )}
        >
          Apply Now
        </Link>
      </div>
    </article>
  );
}
