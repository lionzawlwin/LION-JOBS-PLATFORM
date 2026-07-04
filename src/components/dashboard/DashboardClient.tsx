'use client';

import { useState } from 'react';
import { BarChart2, Building2, Landmark, Users, Info, PenSquare, Mail, LayoutGrid, Table2, PlusSquare, Briefcase, ClipboardList, Scale, Receipt, UserCog, Activity } from 'lucide-react';
import { KanbanBoard } from './KanbanBoard';
import { PostJobForm } from './PostJobForm';
import { JobsPanel } from './JobsPanel';
import { CompaniesView } from './CompaniesView';
import { EnterpriseView } from './EnterpriseView';
import { B2bLeadsTable } from './B2bLeadsTable';
import { ContentStudio } from './ContentStudio';
import { EmailCampaigns } from './EmailCampaigns';
import { LegalView } from './LegalView';
import { BillingView } from './BillingView';
import { TeamView } from './TeamView';
import { SystemHealthView } from './SystemHealthView';
import { AnalyticsOverview } from './AnalyticsOverview';
import { CandidateDataTable } from './CandidateDataTable';
import { MyApplicationsClient } from '@/components/apply/MyApplicationsClient';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { TabDomain } from '@/lib/permissions';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StaffRole } from '@/types';

type Tab = TabDomain;

interface Props {
  isAdmin?: boolean;
  role?: StaffRole;
  // RBAC Step 2 (Layer 6, Dynamic RBAC): computed server-side in
  // dashboard/page.tsx, since getAccessLevel is now async and DB-backed —
  // this client component can no longer call it directly.
  visibleTabs?: TabDomain[];
}

export function DashboardClient({ isAdmin = false, role, visibleTabs = [] }: Props) {
  const effectiveRole = role ?? 'viewer';
  // owner/admin/viewer keep the existing Overview default; cse's actual
  // working domain is Companies/Enterprise/B2B Leads (they have no
  // access to Candidates/Post Job/Content at all), so defaulting them
  // there avoids landing on a tab they'd immediately need to navigate
  // away from. Per Phase 11 spec, signed off by the repo owner.
  const [activeTab,   setActiveTab]   = useState<Tab>(effectiveRole === 'cse' ? 'enterprise' : 'overview');
  const [candView,    setCandView]    = useState<'table' | 'board'>('table');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useLanguage();

  const ALL_TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
    { value: 'overview',   label: t('admin_tab_overview'),   icon: <BarChart2     size={14} /> },
    { value: 'candidates', label: t('admin_tab_candidates'), icon: <Users         size={14} /> },
    { value: 'post-job',   label: t('admin_tab_post_job'),   icon: <PlusSquare    size={14} /> },
    { value: 'manage-jobs',label: t('admin_tab_manage_jobs'),icon: <Briefcase     size={14} /> },
    { value: 'companies',  label: t('admin_tab_companies'),  icon: <Building2     size={14} /> },
    { value: 'enterprise', label: t('admin_tab_enterprise'), icon: <Landmark      size={14} /> },
    { value: 'b2b-leads',  label: t('admin_tab_b2b_leads'),  icon: <ClipboardList size={14} /> },
    { value: 'content',    label: t('admin_tab_content'),    icon: <PenSquare     size={14} /> },
    { value: 'campaigns',  label: t('admin_tab_campaigns'),  icon: <Mail          size={14} /> },
    { value: 'legal',      label: t('admin_tab_legal'),      icon: <Scale         size={14} /> },
    { value: 'billing',    label: t('admin_tab_billing'),    icon: <Receipt       size={14} /> },
    { value: 'team',       label: t('admin_tab_team'),       icon: <UserCog       size={14} /> },
    { value: 'system-health', label: t('admin_tab_system_health'), icon: <Activity size={14} /> },
  ];

  const TABS = ALL_TABS.filter((tab) => visibleTabs.includes(tab.value));

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
      {/* Mobile nav bar — static, not floating. Sticky, full-bleed (the
          negative margins cancel the parent container's px-4/sm:px-6
          padding so this reads as a proper app bar, not an indented
          button). Desktop uses the persistent rail sidebar below instead
          — this bar only exists <md. */}
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-border bg-background px-4 py-3 sm:-mx-6 sm:px-6 md:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open dashboard navigation"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Menu size={18} />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {TABS.find((tab) => tab.value === activeTab)?.label}
        </span>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <div className="hidden md:block">
          <Sidebar
            tabs={TABS}
            activeTab={activeTab}
            onSelect={setActiveTab}
          />
        </div>

        {/* Sidebar — mobile drawer. Slides in from the left over a solid
            (not see-through) panel — Sidebar.tsx's "drawer" variant uses
            an opaque bg-background, only the backdrop behind it fades in
            translucent. */}
        <AnimatePresence>
          {mobileNavOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
                className="relative h-full"
              >
                <Sidebar
                  tabs={TABS}
                  activeTab={activeTab}
                  onSelect={(tab) => { setActiveTab(tab); setMobileNavOpen(false); }}
                  variant="drawer"
                  onClose={() => setMobileNavOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1">
      {/* Context banner */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        <span>
          {t('admin_banner_prefix')}
          {activeTab === 'overview'    && t('admin_banner_overview')}
          {activeTab === 'candidates'  && t('admin_banner_candidates')}
          {activeTab === 'post-job'    && t('admin_banner_post_job')}
          {activeTab === 'manage-jobs' && t('admin_banner_manage_jobs')}
          {activeTab === 'companies'   && t('admin_banner_companies')}
          {activeTab === 'enterprise'  && t('admin_banner_enterprise')}
          {activeTab === 'b2b-leads'   && t('admin_banner_b2b_leads')}
          {activeTab === 'content'     && t('admin_banner_content')}
          {activeTab === 'campaigns'   && t('admin_banner_campaigns')}
          {activeTab === 'legal'       && t('admin_banner_legal')}
          {activeTab === 'billing'     && t('admin_banner_billing')}
          {activeTab === 'team'        && t('admin_banner_team')}
          {activeTab === 'system-health' && t('admin_banner_system_health')}
        </span>
      </div>

      {activeTab === 'overview' && <AnalyticsOverview />}

      {activeTab === 'candidates' && (
        <>
          {/* View toggle */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">{t('cand_pipeline_title')}</h3>
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
              <button
                onClick={() => setCandView('table')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  candView === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Table2 size={12} /> {t('cand_view_table')}
              </button>
              <button
                onClick={() => setCandView('board')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  candView === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <LayoutGrid size={12} /> {t('cand_view_kanban')}
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
      {activeTab === 'legal'       && <LegalView />}
      {activeTab === 'billing'     && <BillingView />}
      {activeTab === 'team'        && <TeamView role={role} />}
      {activeTab === 'system-health' && <SystemHealthView />}
        </main>
      </div>
    </>
  );
}
