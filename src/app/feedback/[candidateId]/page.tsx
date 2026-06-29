import type { Metadata } from 'next';
import { MessageSquareHeart } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { InterviewFeedback } from '@/components/apply/InterviewFeedback';

export const metadata: Metadata = {
  title: 'Interview Feedback | Lion Jobs',
  description: 'Share your interview experience and help other candidates at Lion Jobs Myanmar.',
  robots: { index: false },
};

interface Props {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ company?: string; job?: string }>;
}

export default async function FeedbackPage({ params, searchParams }: Props) {
  const { candidateId } = await params;
  const { company, job } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="mx-auto max-w-lg px-4">

          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-600/10">
              <MessageSquareHeart size={32} className="text-brand-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Share Your Feedback</h1>
            {company && (
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Interview at <span className="text-foreground">{company}</span>
                {job && ` — ${job}`}
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Your candid experience helps us improve hiring quality and assists future candidates.
            </p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <InterviewFeedback
              candidateId={candidateId}
              company={company ?? ''}
              jobTitle={job ?? ''}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
