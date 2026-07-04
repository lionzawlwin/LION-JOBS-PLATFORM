import { supabase } from '@/lib/supabase';
import type { Job, JobCategory, JobType } from '@/types';

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
  };
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

  const { error } = await supabase.from('jobs').insert({
    id,
    title:        data.title,
    company:      data.company,
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
