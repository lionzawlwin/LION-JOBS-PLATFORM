'use client';

import { useState } from 'react';
import { BarChart2, Building2, Landmark, Users, Info, PenSquare, Mail, LayoutGrid, Table2, PlusSquare, Briefcase, ClipboardList } from 'lucide-react';
import { KanbanBoard } from './KanbanBoard';
import { PostJobForm } from './PostJobForm';
import { JobsPanel } from './JobsPanel';
import { CompaniesView } from './CompaniesView';
import { EnterpriseView } from './EnterpriseView';
import { B2bLeadsTable } from './B2bLeadsTable';
import { ContentStudio } from './ContentStudio';
import { EmailCampaigns } from './EmailCampaigns';
import { AnalyticsOverview } from './AnalyticsOverview';
import { CandidateDataTable } from './CandidateDataTable';
import { MyApplicationsClient } from '@/components/apply/MyApplicationsClient';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies' | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'overview',   label: 'Overview',          icon: <BarChart2     size={14} /> },
  { value: 'candidates', label: 'Candidates',         icon: <Users         size={14} /> },
  { value: 'post-job',   label: 'Post a New Job',     icon: <PlusSquare    size={14} /> },
  { value: 'manage-jobs',label: 'Manage Jobs',        icon: <Briefcase     size={14} /> },
  { value: 'companies',  label: 'B2B Companies',      icon: <Building2     size={14} /> },
  { value: 'enterprise', label: 'Enterprise',         icon: <Landmark      size={14} /> },
  { value: 'b2b-leads',  label: 'B2B Hiring Requests',icon: <ClipboardList size={14} /> },
  { value: 'content',    label: 'Content Studio',     icon: <PenSquare     size={14} /> },
  { value: 'campaigns',  label: 'Email Campaigns',    icon: <Mail          size={14} /> },
];

interface Props {
  isAdmin?: boolean;
}

export function DashboardClient({ isAdmin = false }: Props) {
  const [activeTab,   setActiveTab]   = useState<Tab>('overview');
  const [candView,    setCandView]    = useState<'table' | 'board'>('table');

  if (!isAdmin) {
    // Non-admin: public candidate status view only
    return (
      <div className="rounded-2xl border border-border bg-background/50 backdrop-blur-sm">
        <MyApplicationsClient />
      </div>
    );
  }

  return (
    <>
      {/* Tab switcher */}
      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Context banner */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          Admin dashboard — Lion Jobs Agency internal use only.
          {activeTab === 'overview'    && ' Real-time analytics across candidates, jobs, and companies.'}
          {activeTab === 'candidates'  && ' Manage candidate applications and pipeline stages.'}
          {activeTab === 'post-job'    && ' Create and publish new job listings to the platform.'}
          {activeTab === 'manage-jobs' && ' Edit, pause, or close existing job postings.'}
          {activeTab === 'companies'   && ' B2B employer CRM — track leads, clients, and send targeted emails.'}
          {activeTab === 'enterprise'  && ' Enterprise CRM — track corporate accounts, contract value, and CSE performance.'}
          {activeTab === 'b2b-leads'   && ' Incoming hiring requests from employers. Update status to track progress.'}
          {activeTab === 'content'     && ' Generate social media posts for Facebook, Telegram, WhatsApp, and LinkedIn.'}
          {activeTab === 'campaigns'   && ' Send marketing emails to employers. Powered by Resend (3K/month free).'}
        </span>
      </div>

      {activeTab === 'overview' && <AnalyticsOverview />}

      {activeTab === 'candidates' && (
        <>
          {/* View toggle */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Candidate Pipeline</h3>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
              <button
                onClick={() => setCandView('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  candView === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Table2 size={12} /> Table
              </button>
              <button
                onClick={() => setCandView('board')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  candView === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid size={12} /> Kanban
              </button>
            </div>
          </div>

          {candView === 'table' ? <CandidateDataTable /> : <KanbanBoard />}
        </>
      )}

      {activeTab === 'post-job'    && <PostJobForm />}
      {activeTab === 'manage-jobs' && <JobsPanel />}
      {activeTab === 'companies'   && <CompaniesView />}
      {activeTab === 'enterprise'  && <EnterpriseView />}
      {activeTab === 'b2b-leads'   && <B2bLeadsTable />}
      {activeTab === 'content'     && <ContentStudio />}
      {activeTab === 'campaigns'   && <EmailCampaigns />}
    </>
  );
}
