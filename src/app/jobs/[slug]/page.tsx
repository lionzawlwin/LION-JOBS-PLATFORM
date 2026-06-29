import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, DollarSign, Zap } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { JobPostingSchema } from '@/components/seo/JobPostingSchema';
import { ShareButton } from '@/components/jobs/ShareButton';
import { SimilarJobs } from '@/components/jobs/SimilarJobs';
import { TrackJobView } from '@/components/jobs/TrackJobView';
import { JoinCommunity } from '@/components/JoinCommunity';
import { getJobs } from '@/lib/sheets';
import { buildJobSlug, formatSalary, timeAgo, cn } from '@/lib/utils';

// Pre-render all known job slugs at build time; new jobs fall back to SSR
// on first request and are then cached (dynamicParams = true is the default).
export const revalidate = 3600;

const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

// ── Static params ─────────────────────────────────────────────────
export async function generateStaticParams() {
  const jobs = await getJobs();
  return jobs.map((job) => ({ slug: buildJobSlug(job) }));
}

// ── Dynamic metadata (injected into <head>) ───────────────────────
export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await props.params;
  const jobs  = await getJobs(); // deduplicated via React cache()
  const job   = jobs.find((j) => buildJobSlug(j) === slug);

  if (!job) return { title: 'Job Not Found | Lion Jobs Myanmar' };

  const title       = `${job.title} at ${job.company} | Lion Jobs Myanmar`;
  const description = `${job.description.slice(0, 155).trim()}… Apply now via Lion Jobs Agency in Myanmar.`;
  const url         = `${SITE_URL}/jobs/${slug}`;

  return {
    title,
    description,
    keywords: [
      job.title, job.company, job.location, job.category,
      'jobs myanmar', 'အလုပ်အကိုင်', 'lion jobs',
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'my_MM',
      alternateLocale: ['en_US'],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────
export default async function JobDetailPage(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const jobs     = await getJobs(); // same cache hit as generateMetadata
  const job      = jobs.find((j) => buildJobSlug(j) === slug);

  if (!job) notFound();

  const jobUrl  = `${SITE_URL}/jobs/${slug}`;
  const related = jobs
    .filter((j) => j.category === job.category && j.id !== job.id)
    .slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      {/* JSON-LD injected into <head> via React's built-in hoisting */}
      <JobPostingSchema job={job} jobUrl={jobUrl} />

      <Navbar />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

          {/* Back */}
          <Link
            href="/#jobs"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} /> Back to all jobs
          </Link>

          {/* ── Hero card ── */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {job.isUrgent && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <Zap size={11} /> Urgent Hiring
                </span>
              )}
              {job.isFeatured && (
                <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-600/10 dark:text-brand-400">
                  ⭐ Featured
                </span>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Posted {timeAgo(job.postedAt)}
              </span>
            </div>

            {/* Title + company */}
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              {job.title}
            </h1>
            <p className="mt-1 text-base font-semibold text-muted-foreground">{job.company}</p>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin size={14} className="text-brand-600" /> {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-brand-600" />
                <Badge variant="secondary">{job.type}</Badge>
              </span>
              <Badge variant="secondary">{job.category}</Badge>
            </div>

            {/* Salary */}
            {job.salaryMin > 0 && (
              <div className="mt-4 flex items-center gap-1.5 text-lg font-bold text-foreground">
                <DollarSign size={16} className="text-brand-600" />
                {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
            )}

            {/* CTA */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/apply/${job.id}`}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-600/20',
                )}
              >
                Apply Now — It&apos;s Free
              </Link>
              <a
                href={`https://wa.me/959428954289?text=${encodeURIComponent(`Hi Lion Jobs! I'm interested in: ${job.title} at ${job.company}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-green-200 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100 dark:border-green-700/30 dark:bg-green-900/20 dark:text-green-400"
              >
                Ask via WhatsApp
              </a>
              <ShareButton
                url={jobUrl}
                title={job.title}
                company={job.company}
                className="ml-auto h-10 w-10 rounded-xl"
              />
            </div>
          </div>

          {/* ── Two-column layout: description + requirements ── */}
          <div className="mt-6 grid gap-6 lg:grid-cols-3">

            {/* Left: description */}
            <div className="space-y-6 lg:col-span-2">
              {job.description && (
                <section className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="mb-3 text-base font-bold text-foreground">Job Description</h2>
                  <div className="prose prose-sm max-w-none text-muted-foreground">
                    {job.description.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">{line}</p>
                    ))}
                  </div>
                </section>
              )}

              {job.requirements.length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="mb-3 text-base font-bold text-foreground">Requirements</h2>
                  <ul className="space-y-2">
                    {job.requirements.map((req) => (
                      <li key={req} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Right: agency info */}
            <div className="space-y-4 lg:col-span-1">
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-bold text-foreground">About This Listing</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agency</dt>
                    <dd className="mt-0.5 font-medium text-foreground">Lion Jobs Agency</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</dt>
                    <dd className="mt-0.5 text-foreground">{job.location}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job Type</dt>
                    <dd className="mt-0.5 text-foreground">{job.type}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</dt>
                    <dd className="mt-0.5 text-foreground">{job.category}</dd>
                  </div>
                </dl>
                <Link
                  href={`/apply/${job.id}`}
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'mt-4 w-full justify-center rounded-xl bg-brand-600 text-white hover:bg-brand-700',
                  )}
                >
                  Apply Now
                </Link>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5 text-center">
                <p className="text-xs text-muted-foreground">Need help? Our recruiters are online.</p>
                <a
                  href="https://wa.me/959428954289"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* ── Similar jobs ── */}
          <SimilarJobs jobs={related} category={job.category} />

          {/* Track this view in recently-viewed (client-side localStorage) */}
          <TrackJobView jobId={job.id} />
        </div>

        <JoinCommunity />
      </main>

      <Footer />
    </div>
  );
}
