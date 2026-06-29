import type { Metadata } from 'next';
import { Briefcase, Shield } from 'lucide-react';
import { LoginButton } from './LoginButton';

export const metadata: Metadata = {
  title: 'Admin Login | Lion Jobs Agency',
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50/40 px-4 dark:from-brand-950/20 dark:to-slate-950">

      {/* Card */}
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-xl shadow-brand-600/5">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
            <Briefcase size={24} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">
              Lion <span className="text-brand-600">Jobs</span> Agency
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Internal Admin Dashboard</p>
          </div>
        </div>

        {/* Access notice */}
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-700/30 dark:bg-amber-900/10">
          <Shield size={15} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Restricted access. Only the authorised admin account can sign in.
          </p>
        </div>

        <LoginButton />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by Google OAuth &middot; Secured by Lion Jobs
        </p>
      </div>
    </div>
  );
}
