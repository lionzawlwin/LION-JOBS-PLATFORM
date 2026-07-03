import type { Metadata } from 'next';
import { ChooserClient } from '@/components/ChooserClient';

export const metadata: Metadata = {
  title: 'Lion Jobs Agency — Find Jobs or Hire Talent in Myanmar',
  description:
    "Myanmar's premier recruitment agency. Job seekers browse 500+ vetted " +
    'roles for free. Employers get pre-screened candidates fast.',
  alternates: {
    canonical: `${process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app'}/`,
  },
  openGraph: {
    title: 'Lion Jobs Agency',
    description: "Myanmar's premier recruitment agency — for candidates and employers.",
    type: 'website',
  },
};

export default function ChooserPage() {
  return <ChooserClient />;
}
