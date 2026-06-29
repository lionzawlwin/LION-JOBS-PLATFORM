import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, MapPin, Briefcase, Building2 } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { JobCard } from '@/components/jobs/JobCard';
import { getJobs } from '@/lib/sheets';
import { buildJobSlug } from '@/lib/utils';

export const revalidate = 3600;

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function generateStaticParams() {
  const jobs     = await getJobs();
  const seen     = new Set<string>();
  const slugs: { slug: string }[] = [];
  for (const job of jobs) {
    const s = slugify(job.company);
    if (!seen.has(s)) { seen.add(s); slugs.push({ slug: s }); }
  }
  return slugs;
}

export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await props.params;
  const jobs     = await getJobs();
  const company  = jobs.find((j) => slugify(j.company) === slug)?.company;
  if (!company) return { title: 'Company Not Found | Lion Jobs Myanmar' };
  return {
    title: `${company} Jobs in Myanmar | Lion Jobs Agency`,
    description: `Browse all open positions at ${company} listed through Lion Jobs Agency, Myanmar.`,
  };
}

export default async function CompanyProfilePage(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const jobs     = await getJobs();
  const companyName = jobs.find((j) => slugify(j.company) === slug)?.company;
  if (!companyName) notFound();

  const companyJobs = jobs.filter((j) => j.company === companyName);
  const categories  = [...new Set(companyJobs.map((j) => j.category))];
  const locations   = [...new Set(companyJobs.map((j) => j.location))];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">

        {/* Hero banner */}
        <div className="border-b border-border bg-gradient-to-br from-brand-50 to-blue-50/40 py-12 dark:from-brand-950/20 dark:to-blue-950/10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Link href="/#jobs" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft size={14} /> All Jobs
            </Link>
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white text-2xl font-bold shadow-lg shadow-brand-600/20">
                {companyName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{companyName}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Briefcase size={13} /> {companyJobs.length} open position{companyJobs.length !== 1 ? 's' : ''}</span>
                  {locations.slice(0, 2).map((loc) => (
                    <span key={loc} className="flex items-center gap-1.5"><MapPin size={13} /> {loc}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Category chips */}
            {categories.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span key={cat} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-0.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Job listings */}
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-lg font-bold text-foreground">
            Open Positions at {companyName}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {companyJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
