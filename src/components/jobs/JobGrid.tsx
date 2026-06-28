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
      <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
        <p className="text-lg font-medium text-foreground">No roles match your filters</p>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or clearing filters.</p>
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
