'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import { useJobApplicants } from '@/hooks/useJobApplicants';
import { cumulativeFunnelCounts, computeHiringFunnel, type FunnelStageKey, type HiringFunnelStage } from '@/lib/portalAnalytics';
import { Loader2, Building2, Briefcase, FileText, FileSignature, LogOut, MapPin, ArrowUpCircle, Check, Eye, Sparkles, Languages, ChevronDown, ChevronUp, Download, User, TrendingUp, ArrowUpDown, AlertTriangle } from 'lucide-react';

interface JobSummary {
  id: string;
  title: string;
  location: string;
  category: string;
  type: string;
  postedAt: string;
  viewCount: number;
  isFeatured: boolean;
  featuredUntil: string | null;
  applicantCounts: { Applied: number; Shortlisted: number; Interview: number; Hired: number };
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  position: string;
  agreedSalary: number;
  commissionFeeMmk: number;
  status: string;
  issuedAt: string;
}

interface ContractSummary {
  id: string;
  contractType: string;
  status: string;
  value: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
}

interface InsightsSummary {
  totalJobsPosted: number;
  totalViews: number;
  totalApplicants: number;
  viewToApplyRate: number | null;
  hiredCount: number;
  fillRate: number | null;
  avgMatchScore: number | null;
  avgDaysToFirstApplicantHired: number | null;
  funnel: HiringFunnelStage[];
}

const FUNNEL_LABEL_KEY: Record<FunnelStageKey, TranslationKey> = {
  views:       'cp_col_views',
  applied:     'ov_stage_applied',
  shortlisted: 'ov_stage_shortlisted',
  interview:   'ov_stage_interview',
  hired:       'ov_stage_hired',
};

type JobSortKey = 'recent' | 'views' | 'applicants' | 'conversion' | 'attention';

interface MeResponse {
  company: {
    id: string; name: string; industry: string; city: string; tier: string;
    isFeatured: boolean; featuredUntil: string | null;
    featuredPlacementPriceMmk: number; featuredPlacementDurationDays: number;
  };
  jobBoost: { priceMmk: number; durationDays: number };
  insights: InsightsSummary;
  jobs: JobSummary[];
  invoices: InvoiceSummary[];
  contracts: ContractSummary[];
}

const STAGE_BADGE_CLASSES: Record<string, string> = {
  Applied:     'bg-muted text-muted-foreground',
  Shortlisted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Interview:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  Hired:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const STAGE_KEY: Record<string, TranslationKey> = {
  Applied:     'ov_stage_applied',
  Shortlisted: 'ov_stage_shortlisted',
  Interview:   'ov_stage_interview',
  Hired:       'ov_stage_hired',
};

// Employer Applicant Visibility -- name + resume/CV only, no contact info
// by default (the repo owner's explicit decision: the agency stays the
// required intermediary for actually reaching a candidate). Direct-
// Contact-Info Upsell Tier (2026-07-07) is the one paid, opt-in exception
// to that -- see getApplicantsForJob()'s own comment. Only ever mounted
// while its job row is expanded, so this is the one place per session
// that fetches a given job's applicant list.
function ApplicantList({ jobId }: { jobId: string }) {
  const { t } = useLanguage();
  const { applicants, contactUnlockPriceMmk, loading, mutate } = useJobApplicants(jobId);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleUnlockRequest(applicationId: string) {
    setBusyId(applicationId);
    try {
      const res = await fetch('/api/company-portal/contact-unlock-requests', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId, applicationId }),
      });
      if (res.ok) await mutate();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>;
  }

  if (applicants.length === 0) {
    return <p className="py-3 text-center text-xs text-muted-foreground">{t('cp_applicants_empty')}</p>;
  }

  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {applicants.map((a) => (
        <li key={a.id} className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><User size={12} /></span>
              <span className="truncate font-medium text-foreground">{a.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STAGE_BADGE_CLASSES[a.stage] ?? ''}`}>
                {t(STAGE_KEY[a.stage])}
              </span>
            </div>
            {a.cvUrl && (
              <a
                href={a.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Download size={11} /> {t('cp_view_resume')}
              </a>
            )}
          </div>

          {/* Direct-Contact-Info Upsell Tier -- one of four states */}
          {a.contactUnlockStatus === 'paid' ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <span><strong>{t('cp_unlocked_phone_label')}:</strong> {a.phone}</span>
              {a.email && <span><strong>{t('cp_unlocked_email_label')}:</strong> {a.email}</span>}
            </div>
          ) : a.contactUnlockStatus === 'pending' ? (
            <p className="text-[11px] text-muted-foreground">{t('cp_unlock_requested')}</p>
          ) : a.directContactConsent ? (
            <button
              onClick={() => handleUnlockRequest(a.id)}
              disabled={busyId === a.id}
              className="flex w-fit items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60 dark:border-brand-700/30 dark:bg-brand-900/20 dark:text-brand-300"
            >
              {busyId === a.id
                ? <Loader2 size={11} className="animate-spin" />
                : t('cp_unlock_contact_cta').replace('{price}', contactUnlockPriceMmk.toLocaleString())
              }
            </button>
          ) : (
            <p className="text-[11px] text-muted-foreground">{t('cp_unlock_not_enabled')}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CompanyPortalClientImpl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, toggleLang } = useLanguage();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestingSlots, setRequestingSlots] = useState(false);
  const [slotRequestSent, setSlotRequestSent] = useState(false);
  const [requestingFeatured, setRequestingFeatured] = useState(false);
  const [featuredRequestSent, setFeaturedRequestSent] = useState(false);
  const [boostingJobId, setBoostingJobId] = useState<string | null>(null);
  const [boostedJobIds, setBoostedJobIds] = useState<Set<string>>(new Set());
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobSort, setJobSort] = useState<JobSortKey>('recent');

  // Item #3 of the 2026-07-07 CTO Big Upgrades Portfolio: per-job funnel +
  // conversion, computed client-side from data already in this response
  // (job.viewCount + job.applicantCounts) via the same pure function the
  // aggregate funnel above uses -- no extra fetch, one implementation.
  const jobsWithFunnel = useMemo(() => {
    if (!data) return [];
    return data.jobs.map((job) => {
      const funnel = computeHiringFunnel(cumulativeFunnelCounts(job.viewCount, job.applicantCounts));
      const viewToApplyRate = funnel[1].conversionFromPrevious; // views -> applied
      const totalApplicants = funnel[1].count;
      const needsAttention = job.viewCount >= 10 && totalApplicants === 0;
      return { job, viewToApplyRate, totalApplicants, needsAttention };
    });
  }, [data]);

  const topPerformerJobId = useMemo(() => {
    const withApplicants = jobsWithFunnel.filter((j) => j.totalApplicants > 0 && j.viewToApplyRate !== null);
    if (withApplicants.length < 2) return null; // "top" is meaningless with 0-1 comparable jobs
    return withApplicants.reduce((best, cur) => (cur.viewToApplyRate! > best.viewToApplyRate! ? cur : best)).job.id;
  }, [jobsWithFunnel]);

  const sortedJobs = useMemo(() => {
    const copy = [...jobsWithFunnel];
    switch (jobSort) {
      case 'views':       return copy.sort((a, b) => b.job.viewCount - a.job.viewCount);
      case 'applicants':  return copy.sort((a, b) => b.totalApplicants - a.totalApplicants);
      case 'conversion':  return copy.sort((a, b) => (b.viewToApplyRate ?? -1) - (a.viewToApplyRate ?? -1));
      case 'attention':   return copy.sort((a, b) => Number(b.needsAttention) - Number(a.needsAttention));
      case 'recent':
      default:            return copy; // API already returns jobs most-recent-first
    }
  }, [jobsWithFunnel, jobSort]);

  // Fires once per real login (the ?login=success param verify/route.ts
  // adds), not on every subsequent page view of the same session --
  // stripped from the URL immediately after so a refresh doesn't re-fire it.
  useEffect(() => {
    if (searchParams.get('login') === 'success') {
      trackEvent('portal_login', { portal: 'company' });
      router.replace('/company/portal');
    }
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/company-portal/me');
        if (res.status === 401) { router.replace('/company/portal/login'); return; }
        if (!res.ok) { if (!cancelled) setError(true); return; }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  async function handleRequestMoreSlots() {
    setRequestingSlots(true);
    try {
      const res = await fetch('/api/company-portal/plan-upgrade-request', { method: 'POST' });
      if (res.ok) setSlotRequestSent(true);
    } finally {
      setRequestingSlots(false);
    }
  }

  async function handleRequestFeatured() {
    setRequestingFeatured(true);
    try {
      const res = await fetch('/api/company-portal/featured-placement-request', { method: 'POST' });
      if (res.ok) {
        setFeaturedRequestSent(true);
        trackEvent('featured_placement_requested');
      }
    } finally {
      setRequestingFeatured(false);
    }
  }

  async function handleRequestJobBoost(jobId: string) {
    setBoostingJobId(jobId);
    try {
      const res = await fetch('/api/company-portal/job-boost-request', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId }),
      });
      if (res.ok) {
        setBoostedJobIds((prev) => new Set(prev).add(jobId));
        trackEvent('job_boost_requested');
      }
    } finally {
      setBoostingJobId(null);
    }
  }

  async function handleLogout() {
    await fetch('/api/company-portal/logout', { method: 'POST' });
    router.replace('/company/portal/login');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">{t('cp_load_error')}</p>
      </div>
    );
  }

  // Raw status strings come from the DB in English (InvoiceStatus/
  // ContractStatus); these translate them for display without changing
  // the underlying values anything else compares against.
  const invoiceStatusLabel: Record<string, string> = {
    Draft:   t('cp_invoice_status_draft'),
    Sent:    t('cp_invoice_status_sent'),
    Paid:    t('cp_invoice_status_paid'),
    Overdue: t('cp_invoice_status_overdue'),
  };
  const contractStatusLabel: Record<string, string> = {
    Draft:      t('contract_status_draft'),
    Active:     t('contract_status_active'),
    Completed:  t('contract_status_completed'),
    Terminated: t('contract_status_terminated'),
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Building2 size={18} /></span>
            <div>
              <h1 className="text-sm font-bold text-foreground">{data.company.name}</h1>
              <p className="text-xs text-muted-foreground">{data.company.industry} · {data.company.city}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              aria-label="Switch language"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <Languages size={13} /> {t('nav_lang_toggle')}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
            >
              <LogOut size={13} /> {t('cp_sign_out')}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 dark:border-amber-700/30 dark:from-amber-950/20 dark:to-orange-950/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                <Sparkles size={18} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-foreground">{t('cp_featured_title')}</h2>
                {data.company.isFeatured ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {data.company.featuredUntil
                      ? t('cp_featured_active_with_date').replace('{date}', new Date(data.company.featuredUntil).toLocaleDateString())
                      : t('cp_featured_active_no_date')}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t('cp_featured_pitch')
                      .replace('{days}', String(data.company.featuredPlacementDurationDays))
                      .replace('{price}', data.company.featuredPlacementPriceMmk.toLocaleString())}
                  </p>
                )}
              </div>
            </div>

            {!data.company.isFeatured && (
              featuredRequestSent ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Check size={13} /> {t('cp_featured_request_sent')}
                </span>
              ) : (
                <button
                  onClick={handleRequestFeatured}
                  disabled={requestingFeatured}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 disabled:opacity-60 transition-colors"
                >
                  {requestingFeatured
                    ? <><Loader2 size={13} className="animate-spin" /> {t('cv_sending')}</>
                    : <><Sparkles size={13} /> {t('cp_featured_cta')}</>
                  }
                </button>
              )
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold text-foreground">{t('cp_insights_title')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t('cp_stat_jobs_posted')}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{data.insights.totalJobsPosted}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t('cp_stat_job_views')}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{data.insights.totalViews}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t('cp_stat_total_applicants')}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{data.insights.totalApplicants}</p>
              {data.insights.viewToApplyRate !== null && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t('cp_stat_view_to_apply_pct').replace('{pct}', String(Math.round(data.insights.viewToApplyRate * 100)))}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t('cp_stat_fill_rate')}</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {data.insights.fillRate !== null ? `${Math.round(data.insights.fillRate * 100)}%` : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{t('cp_stat_avg_days_to_hire')}</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {data.insights.avgDaysToFirstApplicantHired !== null ? `${data.insights.avgDaysToFirstApplicantHired}d` : '—'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            {slotRequestSent ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check size={13} /> {t('cp_slots_request_sent')}
              </span>
            ) : (
              <button
                onClick={handleRequestMoreSlots}
                disabled={requestingSlots}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60"
              >
                {requestingSlots
                  ? <><Loader2 size={13} className="animate-spin" /> {t('cv_sending')}</>
                  : <><ArrowUpCircle size={13} /> {t('cp_request_more_slots')}</>
                }
              </button>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <TrendingUp size={16} /> {t('cp_funnel_title')}
          </h2>
          <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
            {(() => {
              const maxCount = Math.max(...data.insights.funnel.map((s) => s.count), 1);
              return data.insights.funnel.map((stage) => {
                const pct = Math.round((stage.count / maxCount) * 100);
                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-medium text-foreground">{t(FUNNEL_LABEL_KEY[stage.key])}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all duration-700 ease-out"
                        style={{ width: `${stage.count > 0 ? Math.max(pct, 4) : 0}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-bold tabular-nums text-foreground">{stage.count}</span>
                    <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                      {stage.conversionFromPrevious !== null
                        ? t('cp_funnel_conversion_pct').replace('{pct}', String(Math.round(stage.conversionFromPrevious * 100)))
                        : '—'}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Briefcase size={16} /> {t('cp_positions_title')} ({data.jobs.length})
            </h2>
            {data.jobs.length > 1 && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowUpDown size={12} />
                {t('cp_sort_label')}
                <select
                  value={jobSort}
                  onChange={(e) => setJobSort(e.target.value as JobSortKey)}
                  className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                >
                  <option value="recent">{t('cp_sort_recent')}</option>
                  <option value="views">{t('cp_sort_views')}</option>
                  <option value="applicants">{t('cp_sort_applicants')}</option>
                  <option value="conversion">{t('cp_sort_conversion')}</option>
                  <option value="attention">{t('cp_sort_attention')}</option>
                </select>
              </label>
            )}
          </div>
          {data.jobs.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {t('cp_positions_empty')}
            </p>
          ) : (
            <div className="space-y-2">
              {sortedJobs.map(({ job, viewToApplyRate, needsAttention }) => (
                <div key={job.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                        {job.title}
                        {job.isFeatured && (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                            <Sparkles size={9} /> {t('cp_job_featured_badge')}
                          </span>
                        )}
                        {topPerformerJobId === job.id && (
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <TrendingUp size={9} /> {t('cp_top_performer_badge')}
                          </span>
                        )}
                        {needsAttention && (
                          <span className="flex items-center gap-0.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                            <AlertTriangle size={9} /> {t('cp_needs_attention_badge')}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {job.location} · {job.type}</p>
                    </div>
                    <div className="flex gap-3 text-center text-xs">
                      <div><p className="flex items-center justify-center gap-1 font-bold text-foreground"><Eye size={11} className="text-muted-foreground" />{job.viewCount}</p><p className="text-muted-foreground">{t('cp_col_views')}</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Applied}</p><p className="text-muted-foreground">{t('ov_stage_applied')}</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Shortlisted}</p><p className="text-muted-foreground">{t('ov_stage_shortlisted')}</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Interview}</p><p className="text-muted-foreground">{t('ov_stage_interview')}</p></div>
                      <div><p className="font-bold text-emerald-600">{job.applicantCounts.Hired}</p><p className="text-muted-foreground">{t('ov_stage_hired')}</p></div>
                    </div>
                  </div>
                  {viewToApplyRate !== null && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {t('cp_stat_view_to_apply_pct').replace('{pct}', String(Math.round(viewToApplyRate * 100)))}
                    </p>
                  )}
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <button
                      onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      {expandedJobId === job.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {t('cp_view_applicants')}
                    </button>
                    {expandedJobId === job.id && <ApplicantList jobId={job.id} />}
                  </div>
                  {!job.isFeatured && (
                    <div className="mt-2 flex justify-end border-t border-border/50 pt-2">
                      {boostedJobIds.has(job.id) ? (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <Check size={12} /> {t('cp_featured_request_sent')}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRequestJobBoost(job.id)}
                          disabled={boostingJobId === job.id}
                          className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300"
                        >
                          {boostingJobId === job.id
                            ? <><Loader2 size={11} className="animate-spin" /> {t('cv_sending')}</>
                            : <><Sparkles size={11} /> {t('cp_boost_job_cta')
                                .replace('{price}', data.jobBoost.priceMmk.toLocaleString())
                                .replace('{days}', String(data.jobBoost.durationDays))}</>
                          }
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText size={16} /> {t('cp_invoices_title')} ({data.invoices.length})
          </h2>
          {data.invoices.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {t('cp_invoices_empty')}
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="p-3">{t('cp_col_invoice_number')}</th>
                    <th className="p-3">{t('cp_col_position')}</th>
                    <th className="p-3">{t('cp_col_fee')}</th>
                    <th className="p-3">{t('bl_col_status')}</th>
                    <th className="p-3">{t('cp_col_issued')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50">
                      <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.position}</td>
                      <td className="p-3">{inv.commissionFeeMmk.toLocaleString()} MMK</td>
                      <td className="p-3">{invoiceStatusLabel[inv.status] ?? inv.status}</td>
                      <td className="p-3 text-muted-foreground">{new Date(inv.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileSignature size={16} /> {t('cp_contracts_title')} ({data.contracts.length})
          </h2>
          {data.contracts.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              {t('cp_contracts_empty')}
            </p>
          ) : (
            <div className="space-y-2">
              {data.contracts.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.contractType}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {' – '}
                      {c.endDate ? new Date(c.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : t('cp_ongoing')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{c.value.toLocaleString()} {c.currency}</p>
                    <p className="text-xs text-muted-foreground">{contractStatusLabel[c.status] ?? c.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
