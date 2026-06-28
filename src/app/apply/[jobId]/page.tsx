import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ApplicationForm } from '@/components/apply/ApplicationForm';
import { getJobs } from '@/lib/sheets';
import { formatSalary, timeAgo } from '@/lib/utils';
import { MapPin, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default async function ApplyPage(props: PageProps<'/apply/[jobId]'>) {
  const { jobId } = await props.params;
  const jobs = await getJobs();
  const job = jobs.find((j) => j.id === jobId) ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/#jobs"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Back to jobs
          </Link>

          {/* Job context card */}
          {job ? (
            <div className="mb-8 rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{job.title}</h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
                </div>
                {job.isUrgent && (
                  <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
                    Urgent
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {job.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> Posted {timeAgo(job.postedAt)}
                </span>
                <Badge variant="secondary">{job.type}</Badge>
                <Badge variant="secondary">{job.category}</Badge>
              </div>

              <p className="mt-3 text-sm font-semibold text-foreground">
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                <span className="text-xs font-normal text-muted-foreground">/mo</span>
              </p>

              {job.requirements.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.requirements.map((req) => (
                    <span
                      key={req}
                      className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                    >
                      {req}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mb-8 rounded-xl border border-border bg-card p-5">
              <h1 className="text-xl font-bold text-foreground">Apply for a Position</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill out the form below and our team will be in touch within 48 hours.
              </p>
            </div>
          )}

          {/* Application Form */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="mb-5 text-lg font-semibold text-foreground">Your Application</h2>
            <ApplicationForm
              jobId={jobId}
              defaultPosition={job?.title ?? ''}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
