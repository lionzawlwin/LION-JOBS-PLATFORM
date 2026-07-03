// Prevent static prerendering: this page requires live auth headers and
// triggers the next-auth/react module which reads NEXTAUTH_URL at eval time.
export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard | Lion Jobs Agency',
  description: 'Internal admin dashboard for Lion Jobs Agency.',
  robots: { index: false },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  // Any active staff member gets the admin UI, not just ADMIN_EMAIL — role
  // is attached to every session that passed authOptions.ts's signIn gate.
  const role = session.user?.role;
  const isAdmin = !!role;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal dashboard bar — no public nav links (Find Jobs / Hire
          Talent / My Applications don't belong on the internal staff
          tool). Sign-out is the only action a bar needs here. */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-white text-sm">
              🦁
            </span>
            <span className="hidden sm:inline">Lion Jobs</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300">
                <Shield size={10} /> {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            )}
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut size={13} /> Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 sm:py-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={20} className="text-brand-600 sm:size-[22px]" />
              <h1 className="text-xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? `Signed in as ${session.user?.email} · ${role} access`
                : 'Track your job applications.'}
            </p>
          </div>

          <DashboardClient isAdmin={isAdmin} role={role} />
        </div>
      </main>
    </div>
  );
}
