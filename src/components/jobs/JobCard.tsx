'use client';

import Link from 'next/link';
import { MapPin, Clock, Zap, DollarSign, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatSalary, timeAgo, buildJobSlug } from '@/lib/utils';
import { ShareButton } from '@/components/jobs/ShareButton';
import { SaveButton } from '@/components/jobs/SaveButton';
import { MatchBadge } from '@/components/jobs/MatchBadge';
import { getJobSignals } from '@/lib/jobSignals';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Job } from '@/types';

const SITE_URL =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

const AVATAR_GRADIENTS = [
  'from-blue-500 to-blue-700',
  'from-violet-500 to-violet-700',
  'from-emerald-500 to-emerald-700',
  'from-orange-500 to-orange-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-amber-500 to-amber-700',
  'from-indigo-500 to-indigo-700',
  'from-teal-500 to-teal-700',
  'from-pink-500 to-pink-700',
];

function companyGradient(name: string): string {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

const TYPE_COLORS: Record<string, string> = {
  'Full-time': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'Part-time': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Contract':  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Remote':    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Hybrid':    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const SIGNAL_STYLES: Record<string, string> = {
  urgent:   'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  popular:  'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  closing:  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  new:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  featured: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

export function JobCard({ job }: { job: Job }) {
  const { t } = useLanguage();
  const slug    = buildJobSlug(job);
  const jobUrl  = `${SITE_URL}/jobs/${slug}`;
  const signals = getJobSignals(job);
  const gradient = companyGradient(job.company);

  return (
    <article className={cn(
      'group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300',
      'bg-white dark:bg-white/[0.04]',
      'border border-border',
      'hover:border-brand-200 dark:hover:border-brand-700/50',
      'shadow-sm hover:shadow-xl hover:shadow-brand-600/10 hover:-translate-y-1',
      job.isFeatured && [
        'ring-1 ring-gold-400/40 border-gold-300/60 dark:border-gold-500/25',
        'dark:ring-gold-500/20',
      ],
    )}>

      {/* Gold accent stripe for featured */}
      {job.isFeatured && (
        <div className="h-[3px] w-full bg-gradient-to-r from-gold-400 via-gold-500 to-gold-300 shrink-0" />
      )}

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 flex-1">

        {/* Row 1: Company avatar + time + save/share */}
        <div className="flex items-start justify-between gap-2">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            'bg-gradient-to-br text-white text-sm font-extrabold shadow-sm select-none',
            gradient,
          )}>
            {job.company.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-0.5 ml-auto">
            <span className="mr-1 hidden text-xs text-muted-foreground sm:block">
              {timeAgo(job.postedAt)}
            </span>
            <SaveButton jobId={job.id} />
            <ShareButton url={jobUrl} title={job.title} company={job.company} />
          </div>
        </div>

        {/* Row 2: Title + company + time (mobile) */}
        <div>
          <h3 className="text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-brand-600">
            {job.title}
          </h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <a
              href={`/companies/${job.company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-muted-foreground hover:text-brand-600 transition-colors"
            >
              {job.company}
            </a>
            {/* Posted time visible only on mobile */}
            <span className="text-muted-foreground/40 sm:hidden">·</span>
            <span className="text-xs text-muted-foreground sm:hidden">{timeAgo(job.postedAt)}</span>
          </div>
        </div>

        {/* Row 3: Signal + status badges */}
        {(job.isUrgent || job.isFeatured || signals.length > 0 || job.requirements.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {job.isUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Zap size={9} className="shrink-0" /> {t('urgent')}
              </span>
            )}
            {job.isFeatured && (
              <span className="inline-flex items-center rounded-full bg-gold-50 px-2 py-0.5 text-xs font-semibold text-gold-700 dark:bg-gold-600/10 dark:text-gold-400">
                ⭐ {t('featured')}
              </span>
            )}
            {signals.map((s) => (
              <span
                key={s.label}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                  SIGNAL_STYLES[s.variant],
                )}
              >
                {s.variant === 'urgent' && <Zap size={9} />}
                {s.label}
              </span>
            ))}
            <MatchBadge requirements={job.requirements} />
          </div>
        )}

        {/* Row 4: Meta chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="flex items-center gap-1 text-muted-foreground">
            <MapPin size={11} className="shrink-0 text-brand-600" />
            <span className="max-w-[120px] truncate">{job.location}</span>
          </span>
          <span className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
            TYPE_COLORS[job.type] ?? 'bg-muted text-muted-foreground',
          )}>
            <Clock size={9} className="shrink-0" /> {job.type}
          </span>
          <Badge variant="secondary" className="text-xs font-medium">{job.category}</Badge>
        </div>

        {/* Row 5: Description — 2-line CSS clamp */}
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {job.description}
        </p>

        {/* Row 6: Key requirements — flat readable text, no pills */}
        {job.requirements.length > 0 && (
          <p className="text-xs text-muted-foreground/75 leading-relaxed line-clamp-1">
            {job.requirements.slice(0, 4).join(' · ')}
            {job.requirements.length > 4 ? ` · +${job.requirements.length - 4} ${t('jc_more_suffix')}` : ''}
          </p>
        )}
      </div>

      {/* Card footer: salary + Apply button */}
      <div className="mt-auto shrink-0 border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {job.salaryMin > 0 ? (
              <>
                <div className="flex items-center gap-0.5 text-sm font-bold text-foreground">
                  <DollarSign size={13} className="shrink-0 text-brand-600" />
                  <span className="truncate">{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">/ {t('per_month')}</p>
              </>
            ) : (
              <span className="text-sm font-medium text-muted-foreground">{t('negotiable')}</span>
            )}
          </div>

          <Link
            href={`/apply/${job.id}`}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2',
              'text-xs font-bold text-white',
              'bg-brand-600 hover:bg-brand-700',
              'shadow-sm hover:shadow-md hover:shadow-brand-600/30',
              'transition-all duration-200 hover:gap-2',
            )}
          >
            {t('jc_apply')} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </article>
  );
}
