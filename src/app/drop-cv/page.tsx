import type { Metadata } from 'next';
import { Inbox } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { TalentPoolForm } from '@/components/apply/TalentPoolForm';

export const metadata: Metadata = {
  title: 'Join Our Talent Pool | Lion Jobs Myanmar',
  description:
    "Don't see the right job yet? Drop your CV with Lion Jobs Agency and we'll match you with the perfect opportunity in Myanmar when it opens.",
};

export default function DropCVPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero banner */}
      <div className="border-b border-border bg-gradient-to-br from-brand-50 to-blue-50/40 py-12 dark:from-brand-950/20 dark:to-blue-950/10">
        <div className="mx-auto max-w-lg px-4 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
            <Inbox size={28} />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
            Join Our Talent Pool
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            Don&rsquo;t see the right job yet? Leave your CV with us. Our recruiters review
            every submission and will match you with a role the moment it opens up.
          </p>

          {/* Trust chips */}
          <div className="mt-5 flex flex-wrap justify-center gap-3 text-xs">
            {['Free to join', 'No spam', 'We contact you first'].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300"
              >
                ✓ {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <TalentPoolForm />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
