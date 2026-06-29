'use client';

import Link from 'next/link';
import { X, Clock } from 'lucide-react';
import { buildJobSlug } from '@/lib/utils';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import type { Job } from '@/types';

interface Props {
  allJobs: Job[];
}

export function RecentlyViewed({ allJobs }: Props) {
  const { recentIds, removeRecentView } = useRecentlyViewed();

  const recentJobs = recentIds
    .map((id) => allJobs.find((j) => j.id === id))
    .filter(Boolean) as Job[];

  if (recentJobs.length === 0) return null;

  return (
    <div className="border-b border-border/50 bg-muted/30 py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-2.5 flex items-center gap-1.5">
          <Clock size={12} className="text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Recently Viewed
          </span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {recentJobs.map((job) => (
            <div key={job.id} className="relative shrink-0">
              <Link
                href={`/jobs/${buildJobSlug(job)}`}
                className="block w-44 rounded-xl border border-border bg-background p-3 transition-all hover:border-brand-400/60 hover:shadow-sm"
              >
                <p className="line-clamp-1 text-xs font-bold text-foreground">{job.title}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{job.company}</p>
              </Link>
              <button
                type="button"
                onClick={() => removeRecentView(job.id)}
                aria-label={`Remove ${job.title} from recently viewed`}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground transition-colors hover:bg-muted-foreground hover:text-background"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
