import type { MetadataRoute } from 'next';
import { getJobs } from '@/lib/sheets';
import { buildJobSlug } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await getJobs();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/resume-builder`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  const jobRoutes: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${SITE_URL}/jobs/${buildJobSlug(job)}`,
    lastModified: new Date(job.postedAt),
    changeFrequency: 'weekly' as const,
    priority: job.isFeatured ? 0.9 : 0.8,
  }));

  return [...staticRoutes, ...jobRoutes];
}
