import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';
import { FileText } from 'lucide-react';

export const metadata = {
  title: 'Resume Builder | Lion Jobs Agency',
  description: 'Build a professional resume in minutes. Fill in your details and download as PDF — free for all job seekers.',
};

export default function ResumeBuilderPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="no-print mb-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-400">
              <FileText size={12} /> Free Resume Builder
            </div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Build Your Professional Resume
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Fill in your details on the left. Your resume updates instantly on the right.
              Click <strong>Download PDF</strong> when you&apos;re ready — no account needed.
            </p>
          </div>

          <ResumeBuilder />
        </div>
      </main>

      <Footer />
    </div>
  );
}
