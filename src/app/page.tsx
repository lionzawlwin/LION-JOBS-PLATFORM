'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatsBar } from '@/components/landing/StatsBar';
import { SearchBar } from '@/components/jobs/SearchBar';
import { JobFilters } from '@/components/jobs/JobFilters';
import { JobGrid } from '@/components/jobs/JobGrid';
import { useJobs, filterJobs } from '@/hooks/useJobs';
import type { JobFilters as FiltersType } from '@/types';

const DEFAULT_FILTERS: FiltersType = {
  keyword: '',
  category: '',
  location: '',
  type: '',
  salaryMin: 0,
  salaryMax: 0,
};

export default function HomePage() {
  const { jobs, loading, error } = useJobs();
  const [filters, setFilters] = useState<FiltersType>(DEFAULT_FILTERS);

  const filtered = filterJobs(jobs, filters);

  function handleFilterChange(patch: Partial<FiltersType>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <HeroSection />
        <StatsBar />

        {/* Job Board Section */}
        <section id="jobs" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              Open Positions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              All roles are vetted and salary-verified by our agency team.
            </p>
          </div>

          {/* Search + Filters */}
          <div className="mb-6 flex flex-col gap-4">
            <SearchBar filters={filters} onChange={handleFilterChange} />
            <JobFilters filters={filters} onChange={handleFilterChange} total={filtered.length} />
          </div>

          {/* Grid */}
          <JobGrid jobs={filtered} loading={loading} error={error} />
        </section>
      </main>

      <Footer />
    </div>
  );
}
