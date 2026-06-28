'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { JobCard } from './JobCard';
import { JobCardSkeleton } from './JobCardSkeleton';
import type { Job } from '@/types';

interface Props {
  jobs: Job[];
  loading: boolean;
  error?: string | null;
}

export function JobGrid({ jobs, loading, error }: Props) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <JobCardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center text-sm text-danger">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        {/* Briefcase illustration */}
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/60">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-11 w-11 text-muted-foreground/40"
          >
            <rect x="8" y="24" width="48" height="32" rx="5" stroke="currentColor" strokeWidth="3" />
            <path d="M22 24V20a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M8 38h48" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M28 38v4h8v-4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-base font-semibold text-foreground">No roles found</p>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
          No positions match your current filters. Try broadening your search or clearing a filter.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {jobs.map((job, i) => (
          <motion.div
            key={job.id}
            layout
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{
              opacity: 1, y: 0, scale: 1,
              transition: { delay: i * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
          >
            <JobCard job={job} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
