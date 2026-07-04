import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HireForm } from '@/components/hire/HireForm';
import { WhySection } from '@/components/hire/WhySection';

export const metadata: Metadata = {
  title: 'Hire Talent | Lion Jobs Agency — Myanmar\'s Premier Recruitment Partner',
  description:
    'Post your hiring requirements and let Lion Jobs Agency find your ideal candidates. ' +
    'We specialise in pre-screened, quality talent across all industries in Myanmar.',
  openGraph: {
    title: 'Hire Talent — Lion Jobs Agency',
    description: 'Submit your hiring requisition and get matched with top candidates in Myanmar.',
    type: 'website',
  },
};

const STATS = [
  { value: '500+', label: 'Placements Made' },
  { value: '50+',  label: 'Partner Companies' },
  { value: '3–5',  label: 'Days to Shortlist' },
  { value: '95%',  label: 'Client Satisfaction' },
];

export default function CompanyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 py-16 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link href="/candidate" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-200 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to Job Board
              </Link>
              <Link href="/company/portal/login" className="text-sm font-medium text-brand-200 hover:text-white transition-colors">
                Already a client? Log in
              </Link>
            </div>
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-semibold">
                🦁 Lion Jobs Agency — Employer Services
              </div>
              <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
                Find the <span className="text-amber-300">Right Talent</span><br />
                for Your Team
              </h1>
              <p className="mt-4 text-lg text-brand-100 max-w-xl">
                Myanmar&apos;s premier recruitment agency. We source, screen, and deliver pre-qualified candidates —
                so you only meet people worth interviewing.
              </p>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {STATS.map(({ value, label }) => (
                <div key={label} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center backdrop-blur-sm">
                  <p className="text-3xl font-extrabold text-amber-300">{value}</p>
                  <p className="mt-0.5 text-sm font-medium text-brand-100">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Main content ───────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">

            {/* Left: Why Us ─────────────────────────────────────── */}
            <div className="space-y-8">
              <WhySection />

              {/* Testimonial */}
              <div className="rounded-2xl border border-brand-200 bg-brand-50 dark:border-brand-700/30 dark:bg-brand-600/5 p-6">
                <p className="text-sm text-foreground italic leading-relaxed">
                  &ldquo;Lion Jobs Agency filled 3 critical roles within 2 weeks. The quality of candidates
                  far exceeded what we found on general job boards. Highly recommended.&rdquo;
                </p>
                <p className="mt-3 text-xs font-bold text-brand-700 dark:text-brand-300">— HR Director, Leading FMCG Company, Yangon</p>
              </div>

              {/* Process */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Our Simple Process</h3>
                {[
                  { step: '01', title: 'Submit Request',    desc: 'Fill the form — takes under 5 minutes' },
                  { step: '02', title: 'Brief Call',        desc: 'We call you within 1 day to align on requirements' },
                  { step: '03', title: 'Receive Shortlist', desc: '3–5 pre-screened CVs within 3–5 days' },
                  { step: '04', title: 'Interview & Hire',  desc: 'We coordinate interviews and support the offer' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-xs font-bold text-muted-foreground">{step}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Form ─────────────────────────────────────── */}
            <div>
              <div className="rounded-3xl border border-border bg-card p-8 shadow-lg shadow-black/5">
                <HireForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
