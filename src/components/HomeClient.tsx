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

      <section id="jobs" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Open Positions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            All roles are vetted and salary-verified by our agency team.
          </p>
        </div>

        <div className="mb-5 flex flex-col gap-3">
          <SearchBar filters={filters} onChange={handleFilterChange} />
          <JobFilters filters={filters} onChange={handleFilterChange} total={filtered.length} />
        </div>

        <JobGrid jobs={filtered} loading={loading} error={error} />
      </section>

      <JoinCommunity />
    </>
  );
}
