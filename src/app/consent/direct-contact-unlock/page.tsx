import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertTriangle, Briefcase } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Fast-Track Visibility | Lion Jobs Agency',
  robots: { index: false },
};

const STATUS_COPY = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
    title: "You're opted in",
    body: 'Employers can now unlock your direct contact info for a fee, if they choose to. Nothing else about your applications changes — Lion Jobs Agency still handles everything the same way.',
  },
  invalid: {
    icon: XCircle,
    iconClass: 'text-red-600',
    title: 'This link is invalid or has expired',
    body: 'Opt-in links are valid for 30 days after they were sent. If you still want to opt in, contact us and we can help directly.',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-amber-600',
    title: 'Something went wrong',
    body: "We couldn't process your opt-in just now. Please try the link again in a few minutes, or contact us directly.",
  },
} as const;

type Status = keyof typeof STATUS_COPY;

export default async function DirectContactOptInConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status: Status = rawStatus === 'success' || rawStatus === 'invalid' || rawStatus === 'error' ? rawStatus : 'error';
  const { icon: Icon, iconClass, title, body } = STATUS_COPY[status];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50/40 px-4 dark:from-brand-950/20 dark:to-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl shadow-brand-600/5">
        <div className="mb-6 flex flex-col items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Briefcase size={24} />
          </span>
          <h1 className="text-lg font-extrabold text-foreground">
            Lion <span className="text-brand-600">Jobs</span> Agency
          </h1>
        </div>

        <Icon size={40} className={`mx-auto mb-4 ${iconClass}`} />
        <h2 className="mb-2 text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{body}</p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Back to Lion Jobs Agency
        </Link>
      </div>
    </div>
  );
}
