import { supabase } from '@/lib/supabase';
import type { Job, JobCategory, JobType } from '@/types';

export async function getJobs(): Promise<Job[]> {
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
