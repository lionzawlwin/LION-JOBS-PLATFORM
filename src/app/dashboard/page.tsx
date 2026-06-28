import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { KanbanBoard } from '@/components/dashboard/KanbanBoard';
import { PostJobForm } from '@/components/dashboard/PostJobForm';
import { JobsPanel } from '@/components/dashboard/JobsPanel';
import { LayoutDashboard, Info } from 'lucide-react';

export const metadata = {
  title: 'Candidate Pipeline | Lion Jobs Agency',
  description: 'Internal dashboard for managing candidate applications and pipeline stages.',
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
                Candidate Pipeline
              </h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Drag candidates between columns to update their stage in real time.
            </p>
          </div>

          {/* Internal notice */}
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Internal use only — Lion Jobs Agency staff dashboard for managing candidate applications.
            </span>
          </div>

          {/* Post a Job */}
          <PostJobForm />

          {/* Manage / Delete Jobs */}
          <JobsPanel />

          {/* Candidate Board */}
          <KanbanBoard />
        </div>
      </main>

      <Footer />
    </div>
  );
}
