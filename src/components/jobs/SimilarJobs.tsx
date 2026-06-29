import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { buildJobSlug, formatSalary } from '@/lib/utils';
import type { Job } from '@/types';

interface Props {
  jobs: Job[];
  category: string;
}

export function SimilarJobs({ jobs, category }: Props) {
  if (jobs.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold text-foreground">
        More {category} Jobs
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${buildJobSlug(job)}`}
            className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-brand-500/40 hover:shadow-md"
          >
            <p className="text-sm font-bold text-foreground transition-colors group-hover:text-brand-600">
              {job.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{job.company}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin size={11} /> {job.location}
            </div>
            {job.salaryMin > 0 && (
              <p className="mt-1.5 text-xs font-semibold text-brand-600">
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
