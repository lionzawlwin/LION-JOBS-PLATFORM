import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { PortalLoginForm } from '@/components/portal/PortalLoginForm';

export const metadata: Metadata = {
  title: 'Company Portal Sign In | Lion Jobs Agency',
  robots: { index: false },
};

export default async function CompanyPortalLoginPage(
  props: { searchParams: Promise<{ error?: string }> },
) {
  const { error } = await props.searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50/40 px-4 dark:from-brand-950/20 dark:to-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl shadow-brand-600/5">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Building2 size={24} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">Company Portal</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sign in with the email on file for your account. We&apos;ll send you a secure link — no password needed.
            </p>
          </div>
        </div>
        <PortalLoginForm requestLinkApiPath="/api/company-portal/request-link" errorParam={error} />
      </div>
    </div>
  );
}
