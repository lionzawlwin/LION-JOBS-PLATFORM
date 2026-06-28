import type { Job } from '@/types';

const EMPLOYMENT_TYPE: Record<string, string> = {
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  'Contract':  'CONTRACTOR',
  'Remote':    'FULL_TIME',
  'Hybrid':    'FULL_TIME',
};

interface Props {
  job: Job;
  jobUrl: string;
}

export function JobPostingSchema({ job, jobUrl }: Props) {
  const datePosted   = new Date(job.postedAt).toISOString().split('T')[0];
  const validThrough = new Date(
    new Date(job.postedAt).getTime() + 60 * 24 * 60 * 60 * 1000, // 60 days
  ).toISOString().split('T')[0];

  const locality = job.location.split(',')[0]?.trim() ?? 'Yangon';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',

    // ── Required fields (Google for Jobs) ────────────────────────
    title: job.title,
    description:
      job.description ||
      `${job.title} position at ${job.company} in ${job.location}. Apply via Lion Jobs Agency.`,
    datePosted,
    validThrough,
    employmentType: EMPLOYMENT_TYPE[job.type] ?? 'FULL_TIME',

    // ── Hiring organisation ───────────────────────────────────────
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      sameAs: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lion-jobs-platform.vercel.app',
    },

    // ── Location ─────────────────────────────────────────────────
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: locality,
        addressRegion: locality.toLowerCase().includes('mandalay') ? 'Mandalay Region' : 'Yangon Region',
        addressCountry: 'MM',
      },
    },

    // ── Remote / hybrid flag ──────────────────────────────────────
    ...(job.type === 'Remote'
      ? { jobLocationType: 'TELECOMMUTE' }
      : job.type === 'Hybrid'
        ? { applicantLocationRequirements: { '@type': 'Country', name: 'Myanmar' } }
        : {}),

    // ── Salary (strongly improves CTR in Google for Jobs) ─────────
    ...(job.salaryMin > 0 && job.salaryMax > 0
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount',
            currency: job.currency ?? 'MMK',
            value: {
              '@type': 'QuantitativeValue',
              minValue: job.salaryMin,
              maxValue: job.salaryMax,
              unitText: 'MONTH',
            },
          },
        }
      : {}),

    // ── Skills ───────────────────────────────────────────────────
    ...(job.requirements.length > 0
      ? { skills: job.requirements.join(', ') }
      : {}),

    // ── Recruiter branding ────────────────────────────────────────
    employerOverview: 'Placed by Lion Jobs Agency — Myanmar\'s premier recruitment agency.',
    identifier: {
      '@type': 'PropertyValue',
      name: 'Lion Jobs',
      value: job.id,
    },
    url: jobUrl,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
