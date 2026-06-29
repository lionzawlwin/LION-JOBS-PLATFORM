'use client';

import { useState } from 'react';
import { Building2, Users, LayoutDashboard, Info } from 'lucide-react';
import { KanbanBoard } from './KanbanBoard';
import { PostJobForm } from './PostJobForm';
import { JobsPanel } from './JobsPanel';
import { MyApplicationsClient } from '@/components/apply/MyApplicationsClient';
import { cn } from '@/lib/utils';

type Tab = 'employer' | 'candidate';

export function DashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>('employer');

  return (
    <>
      {/* Tab switcher */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
          <button
            onClick={() => setActiveTab('employer')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === 'employer'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Building2 size={14} />
            Employer View
          </button>
          <button
            onClick={() => setActiveTab('candidate')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === 'candidate'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Users size={14} />
            Candidate View
          </button>
        </div>
      </div>

      {activeTab === 'employer' && (
        <>
          {/* Internal notice */}
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>
              Internal use only — Lion Jobs Agency staff dashboard for managing candidate applications.
            </span>
          </div>
          <PostJobForm />
          <JobsPanel />
          <KanbanBoard />
        </>
      )}

      {activeTab === 'candidate' && (
        <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm">
          <MyApplicationsClient />
        </div>
      )}
    </>
  );
}
