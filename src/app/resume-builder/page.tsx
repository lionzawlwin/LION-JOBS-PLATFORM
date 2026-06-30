import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';

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
          {/* Header is rendered inside ResumeBuilder so it can translate */}
          <ResumeBuilder />
        </div>
      </main>

      <Footer />
    </div>
  );
}
