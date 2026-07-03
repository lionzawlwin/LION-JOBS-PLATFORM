'use client';

import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsBar } from '@/components/landing/StatsBar';
import { Testimonials } from '@/components/landing/Testimonials';
import { JobAlerts } from '@/components/landing/JobAlerts';
import { EmailAlerts } from '@/components/landing/EmailAlerts';
import { RecentlyViewed } from '@/components/jobs/RecentlyViewed';
import { SearchBar } from '@/components/jobs/SearchBar';
import { JobFilters } from '@/components/jobs/JobFilters';
import { JobGrid } from '@/components/jobs/JobGrid';
import { useJobs, filterJobs } from '@/hooks/useJobs';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { JoinCommunity } from '@/components/JoinCommunity';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { Job, JobCategory, JobFilters as FiltersType } from '@/types';

const DEFAULT_FILTERS: FiltersType = {
  keyword: '',
  category: '',
  location: '',
  type: '',
  salaryMin: 0,
  salaryMax: 0,
};

interface Props {
  initialJobs: Job[];
  initialTotal?: number;
}

export function HomeClient({ initialJobs, initialTotal }: Props) {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<FiltersType>(DEFAULT_FILTERS);
  const [showSaved, setShowSaved] = useState(false);
  const { savedIds } = useSavedJobs();

  // Server-side filtering when browsing; fetch all when in saved-jobs mode
  const { jobs, loading, error, hasMore, loadingMore, loadMore } = useJobs(
    initialJobs,
    showSaved ? DEFAULT_FILTERS : filters,
    initialTotal,
  );

  const displayJobs = showSaved
    ? filterJobs(jobs, filters).filter((j) => savedIds.includes(j.id))
    : jobs;

  function handleFilterChange(patch: Partial<FiltersType>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleHeroSearch(keyword: string, category: JobCategory | '') {
    setFilters((prev) => ({ ...prev, keyword, category }));
    setShowSaved(false);
  }

  return (
    <>
      <HeroSection onSearch={handleHeroSearch} />
      <RecentlyViewed allJobs={jobs.length ? jobs : initialJobs} />
      <StatsBar liveJobCount={jobs.length || initialJobs.length} />

      <section id="jobs" className="myanmar-pattern py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-600">
                {t('home_section_eyebrow')}
              </p>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                {t('home_open_positions')}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {t('home_open_positions_sub')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* Saved Jobs toggle */}
              <button
                type="button"
                onClick={() => setShowSaved((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  showSaved
                    ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600/40 dark:bg-brand-600/10 dark:text-brand-300'
                    : 'border-border text-muted-foreground hover:border-brand-300 hover:text-brand-600',
                )}
              >
                <Bookmark size={12} className={cn(showSaved && 'fill-current')} />
                {t('home_saved')}
                {savedIds.length > 0 && (
                  <span className={cn(
                    'flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                    showSaved ? 'bg-brand-600 text-white' : 'bg-muted text-muted-foreground',
                  )}>
                    {savedIds.length}
                  </span>
                )}
              </button>

              {!loading && (
                <span className="rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300">
                  {displayJobs.length} {displayJobs.length === 1 ? t('jf_role_singular') : t('jf_role_plural')} {t('home_live_suffix')}
                </span>
              )}
            </div>
          </div>

          {/* Search + filters */}
          <div className="mb-6 space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur-sm shadow-sm">
            <SearchBar filters={filters} onChange={handleFilterChange} />
            <div className="border-t border-border/50 pt-3">
              <JobFilters filters={filters} onChange={handleFilterChange} total={displayJobs.length} />
            </div>
          </div>

          {/* Empty saved state */}
          {showSaved && savedIds.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
              <Bookmark size={32} className="text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">{t('home_no_saved_jobs')}</p>
              <p className="text-xs text-muted-foreground">
                {t('home_no_saved_sub')}
              </p>
              <button
                type="button"
                onClick={() => setShowSaved(false)}
                className="mt-1 rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                {t('home_browse_all_jobs')}
              </button>
            </div>
          )}

          {(!showSaved || savedIds.length > 0) && (
            <JobGrid
              jobs={displayJobs}
              loading={loading}
              error={error}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={loadMore}
            />
          )}
        </div>
      </section>

      <Testimonials />
      <EmailAlerts />
      <JobAlerts />
      <JoinCommunity />
    </>
  );
}
