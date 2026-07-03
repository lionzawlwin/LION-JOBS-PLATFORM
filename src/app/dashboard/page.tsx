// Prevent static prerendering: this page requires live auth headers and
// triggers the next-auth/react module which reads NEXTAUTH_URL at eval time.
export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
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
      <Navbar />

      <main className="flex-1 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LayoutDashboard size={20} className="text-brand-600 sm:size-[22px]" />
                <h1 className="text-xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
                {isAdmin && (
                  <span className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300">
                    <Shield size={10} /> {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin
                  ? `Signed in as ${session.user?.email} · ${role} access`
                  : 'Track your job applications.'}
              </p>
            </div>

            {/* Sign-out link */}
            <Link
              href="/api/auth/signout"
              className="self-start flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:self-auto"
            >
              <LogOut size={13} /> Sign out
            </Link>
          </div>

          <DashboardClient isAdmin={isAdmin} role={role} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
