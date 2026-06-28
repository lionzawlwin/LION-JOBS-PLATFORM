import Link from 'next/link';
import { MapPin, Clock, Zap } from 'lucide-react';
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
      'group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-all duration-200',
      'hover:border-brand-500/40 hover:shadow-md hover:shadow-brand-600/5',
      job.isFeatured && 'ring-1 ring-brand-500/20',
    )}>
      {/* Badges row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {job.isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <Zap size={10} /> Urgent
            </span>
          )}
          {job.isFeatured && (
            <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-600/10 dark:text-brand-400">
              Featured
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(job.postedAt)}</span>
      </div>

      {/* Title + Company */}
      <div>
        <h3 className="font-semibold text-foreground group-hover:text-brand-600 transition-colors">
          {job.title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin size={12} /> {job.location}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          <span className={cn('rounded-full px-2 py-0.5 font-medium', TYPE_COLORS[job.type] ?? 'bg-muted text-muted-foreground')}>
            {job.type}
          </span>
        </span>
        <Badge variant="secondary" className="text-xs">{job.category}</Badge>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed">
        {truncate(job.description, 120)}
      </p>

      {/* Salary + CTA */}
      <div className="mt-auto flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">
          {formatSalary(job.salaryMin, job.salaryMax, job.currency)}<span className="text-xs font-normal text-muted-foreground">/mo</span>
        </span>
        <Link
          href={`/apply/${job.id}`}
          className={cn(buttonVariants({ size: 'sm' }), 'bg-brand-600 hover:bg-brand-700 text-white shrink-0')}
        >
          Apply Now
        </Link>
      </div>
    </article>
  );
}
