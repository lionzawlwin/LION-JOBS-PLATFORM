import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { LayoutDashboard } from 'lucide-react';

export const metadata = {
  title: 'Dashboard | Lion Jobs Agency',
  description: 'Manage job postings and candidate applications. Candidates can also track their application status here.',
};

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={22} className="text-brand-600" />
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                Dashboard
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Employers: manage jobs and candidates. Candidates: track your application status.
            </p>
          </div>

          <DashboardClient />
        </div>
      </main>

      <Footer />
    </div>
  );
}
