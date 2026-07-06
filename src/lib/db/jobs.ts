import { supabase } from '@/lib/supabase';
import type { Job, JobCategory, JobType, Invoice, JobBoostInvoiceMetadata } from '@/types';
import { getCompanyByName } from './companies';

export async function getJobs(): Promise<Job[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('posted_at', { ascending: false });

    if (error) {
      console.error('[db/jobs] getJobs error:', error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
    id:           row.id,
    title:        row.title,
    company:      row.company,
    companyId:    row.company_id ?? null,
    location:     row.location,
    category:     row.category as JobCategory,
    type:         row.type as JobType,
    salaryMin:    row.salary_min,
    salaryMax:    row.salary_max,
    currency:     row.currency,
    description:  row.description,
    requirements: row.requirements ?? [],
    benefits:     row.benefits ?? [],
    postedAt:     row.posted_at,
    isUrgent:     row.is_urgent ?? false,
    isFeatured:   row.is_featured ?? false,
    featuredUntil: row.featured_until ?? null,
    viewCount:    row.view_count ?? 0,
  }));
  } catch (err) {
    console.error('[db/jobs] getJobs error:', err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getJobById(id: string): Promise<Job | null> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[db/jobs] getJobById error:', error.message);
    return null;
  }
  if (!data) return null;

  return {
    id:           data.id,
    title:        data.title,
    company:      data.company,
    companyId:    data.company_id ?? null,
    location:     data.location,
    category:     data.category as JobCategory,
    type:         data.type as JobType,
    salaryMin:    data.salary_min,
    salaryMax:    data.salary_max,
    currency:     data.currency,
    description:  data.description,
    requirements: data.requirements ?? [],
    benefits:     data.benefits ?? [],
    postedAt:     data.posted_at,
    isUrgent:     data.is_urgent ?? false,
    isFeatured:   data.is_featured ?? false,
    featuredUntil: data.featured_until ?? null,
    viewCount:    data.view_count ?? 0,
  };
}

export async function incrementJobViewCount(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_job_view_count', { p_job_id: id });
  if (error) console.error('[db/jobs] incrementJobViewCount error:', error.message);
}

export interface GetJobsPaginatedOptions {
  keyword?: string;
  category?: string;
  type?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  limit?: number;
  offset?: number;
}

// Query-level filtering + pagination for the public job listing
// (/api/jobs GET, candidate/page.tsx's SSR fetch). getJobs() above stays
// untouched and unfiltered — its other 11 call sites (sitemap, cron
// digests, webhooks, apply flow, individual job/company pages) all
// genuinely need the complete list and would silently break if paginated.
//
// Also used, with a generous limit override, by two dashboard call sites
// (JobsPanel.tsx's management table, AnalyticsOverview.tsx's stats) that
// need the effectively-complete list rather than a paginated homepage
// view — the 1000-row cap below covers this app's current scale (500+
// jobs) with real headroom; if the job count ever exceeds it, those two
// dashboard views would need their own real pagination, a follow-up not
// required at today's scale.
export async function getJobsPaginated(
  opts: GetJobsPaginatedOptions = {},
): Promise<{ jobs: Job[]; total: number }> {
  const { keyword, category, type, location, salaryMin, salaryMax } = opts;
  const limit  = Math.min(opts.limit ?? 30, 1000);
  const offset = Math.max(opts.offset ?? 0, 0);

  try {
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .order('posted_at', { ascending: false });

    if (keyword) {
      query = query.or(`title.ilike.%${keyword}%,company.ilike.%${keyword}%,description.ilike.%${keyword}%`);
    }
    if (category) query = query.eq('category', category);
    if (type)     query = query.eq('type', type);
    if (location) query = query.ilike('location', `%${location}%`);
    if (salaryMin) query = query.gt('salary_max', 0).gte('salary_max', salaryMin);
    if (salaryMax) query = query.gt('salary_min', 0).lte('salary_min', salaryMax);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('[db/jobs] getJobsPaginated error:', error.message);
      return { jobs: [], total: 0 };
    }

    const jobs = (data ?? []).map((row) => ({
      id:           row.id,
      title:        row.title,
      company:      row.company,
      companyId:    row.company_id ?? null,
      location:     row.location,
      category:     row.category as JobCategory,
      type:         row.type as JobType,
      salaryMin:    row.salary_min,
      salaryMax:    row.salary_max,
      currency:     row.currency,
      description:  row.description,
      requirements: row.requirements ?? [],
      benefits:     row.benefits ?? [],
      postedAt:     row.posted_at,
      isUrgent:     row.is_urgent ?? false,
      isFeatured:   row.is_featured ?? false,
      featuredUntil: row.featured_until ?? null,
      viewCount:    row.view_count ?? 0,
    }));

    return { jobs, total: count ?? jobs.length };
  } catch (err) {
    console.error('[db/jobs] getJobsPaginated error:', err instanceof Error ? err.message : err);
    return { jobs: [], total: 0 };
  }
}

export async function appendJob(data: {
  title:        string;
  company:      string;
  companyId?:   string | null;
  location:     string;
  category:     string;
  type:         string;
  salaryMin:    number;
  salaryMax:    number;
  currency:     string;
  description:  string;
  requirements: string[];
  isUrgent:     boolean;
  isFeatured:   boolean;
  benefits:     string[];
}): Promise<string> {
  const id = `jb-${Date.now()}`;

  // Auto-resolve company_id by exact name match when the caller doesn't
  // already know it (e.g. the existing free-text Post Job form) -- keeps
  // new jobs correctly linked to the CRM `companies` row going forward
  // without requiring every call site to be rewritten. A job whose
  // company name has no matching CRM row simply gets a null company_id,
  // same as it would have before this column existed.
  let companyId = data.companyId ?? null;
  if (!companyId) {
    const match = await getCompanyByName(data.company);
    companyId = match?.id ?? null;
  }

  const { error } = await supabase.from('jobs').insert({
    id,
    title:        data.title,
    company:      data.company,
    company_id:   companyId,
    location:     data.location,
    category:     data.category,
    type:         data.type,
    salary_min:   data.salaryMin,
    salary_max:   data.salaryMax,
    currency:     data.currency,
    description:  data.description,
    requirements: data.requirements,
    is_urgent:    data.isUrgent,
    is_featured:  data.isFeatured,
    benefits:     data.benefits,
  });

  if (error) throw new Error(`Failed to insert job: ${error.message}`);
  return id;
}

export async function deleteJob(id: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete job: ${error.message}`);
}

// Self-Serve Featured Job Listing Boost: called once an invoice tagged as
// a job-boost charge (see jobRules.ts) is marked Paid. Sets featured_until
// so expireJobBoosts() below knows when to turn it back off -- distinct
// from is_featured being set at job creation via PostJobForm's checkbox,
// which has no expiry.
export async function activateJobBoost(jobId: string, durationDays: number): Promise<void> {
  const featuredUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('jobs')
    .update({ is_featured: true, featured_until: featuredUntil })
    .eq('id', jobId);
  if (error) throw new Error(`Failed to activate job boost: ${error.message}`);
}

// Single choke point both "mark invoice Paid" routes call, same pattern
// as activateFeaturedPlacementIfInvoicePaid in companies.ts. Duration
// comes from the invoice's own metadata, not the current agency_settings
// value, for the same reason: a later price/duration edit must never
// retroactively change what an already-issued invoice activates for.
export async function activateJobBoostIfInvoicePaid(invoice: Invoice): Promise<void> {
  if (invoice.chargeType !== 'job_boost') return;
  const { jobId, durationDays } = invoice.metadata as JobBoostInvoiceMetadata;
  await activateJobBoost(jobId, durationDays);
}

// Daily sweep, piggybacked on the snapshot-stats cron alongside
// expireFeaturedPlacements() -- same "piggyback, don't add a cron slot"
// reasoning. Only ever matches a row with a real featured_until, so a job
// marked featured at creation time (featured_until IS NULL) is never
// touched.
export async function expireJobBoosts(): Promise<number> {
  const { data, error } = await supabase
    .from('jobs')
    .update({ is_featured: false, featured_until: null })
    .eq('is_featured', true)
    .lt('featured_until', new Date().toISOString())
    .select('id');
  if (error) throw new Error(`Failed to expire job boosts: ${error.message}`);
  return data?.length ?? 0;
}
