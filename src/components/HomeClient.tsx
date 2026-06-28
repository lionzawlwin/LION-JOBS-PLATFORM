'use client';

import { useState } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsBar } from '@/components/landing/StatsBar';
import { SearchBar } from '@/components/jobs/SearchBar';
import { JobFilters } from '@/components/jobs/JobFilters';
import { JobGrid } from '@/components/jobs/JobGrid';
import { useJobs, filterJobs } from '@/hooks/useJobs';
import { JoinCommunity } from '@/components/JoinCommunity';
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
}

export function HomeClient({ initialJobs }: Props) {
  // SWR seeded with server-fetched data — Googlebot sees pre-rendered HTML,
  // returning users get a background refresh without a loading flash.
  const { jobs, loading, error } = useJobs(initialJobs);
  const [filters, setFilters] = useState<FiltersType>(DEFAULT_FILTERS);

  const filtered = filterJobs(jobs, filters);

  function handleFilterChange(patch: Partial<FiltersType>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function handleHeroSearch(keyword: string, category: JobCategory | '') {
    setFilters((prev) => ({ ...prev, keyword, category }));
  }

  return (
    <>
      <HeroSection onSearch={handleHeroSearch} />
      <StatsBar />

      <section id="jobs" className="myanmar-pattern py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Section header */}
          <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-brand-600">
                Lion Jobs Agency
              </p>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Open Positions
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Every role is vetted and salary-verified by our team before it goes live.
              </p>
            </div>
            {!loading && (
              <span className="shrink-0 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300">
                {filtered.length} {filtered.length === 1 ? 'role' : 'roles'} live
              </span>
            )}
          </div>

          {/* Search + filters */}
          <div className="mb-6 space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur-sm shadow-sm">
            <SearchBar filters={filters} onChange={handleFilterChange} />
            <div className="border-t border-border/50 pt-3">
              <JobFilters filters={filters} onChange={handleFilterChange} total={filtered.length} />
            </div>
          </div>

          <JobGrid jobs={filtered} loading={loading} error={error} />
        </div>
      </section>

      <JoinCommunity />
    </>
  );
}
