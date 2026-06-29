import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AdminBar } from '@/components/layout/AdminBar';
import { HomeClient } from '@/components/HomeClient';
import { getJobs } from '@/lib/sheets';

// ISR: Vercel regenerates this page at most once per hour.
// Between revalidations, users get cached HTML — Googlebot included.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Lion Jobs Agency | Find Jobs in Myanmar | အလုပ်အကိုင် ရှာဖွေရာ',
  description:
    "Browse 500+ vetted jobs in Yangon, Mandalay and across Myanmar. " +
    "Free for candidates. Apply in minutes. အလုပ်အကိုင် ရှာဖွေပေးသည်။ " +
    "Myanmar's premier recruitment agency.",
  keywords: [
    'jobs in myanmar', 'jobs in yangon', 'myanmar job agency',
    'အလုပ်အကိုင်', 'ရန်ကုန် အလုပ်', 'lion jobs', 'recruitment myanmar',
  ],
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lion-jobs-platform.vercel.app'}/`,
  },
  openGraph: {
    title: "Lion Jobs Agency — Myanmar's #1 Job Portal",
    description: 'Browse 500+ vetted jobs in Yangon & beyond. Free for candidates.',
    type: 'website',
    locale: 'my_MM',
    alternateLocale: ['en_US'],
  },
};

export default async function HomePage() {
  // Fetched server-side at build / revalidation time.
  // The cached() wrapper in sheets.ts ensures a single Sheets API call
  // even if other parts of the render tree also call getJobs().
  const initialJobs = await getJobs();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HomeClient initialJobs={initialJobs} />
      </main>
      <AdminBar />
      <Footer />
    </div>
  );
}
