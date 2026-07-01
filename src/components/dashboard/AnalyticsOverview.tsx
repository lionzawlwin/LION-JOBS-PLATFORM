'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import type { LucideIcon } from 'lucide-react';
import {
  Users, Briefcase, Building2, Trophy, TrendingUp,
  Target, Clock, Loader2, ArrowUpRight, Inbox,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useCandidates } from '@/hooks/useCandidates';
import { useJobs } from '@/hooks/useJobs';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import type { Company } from '@/types';

const STAGE_KEYS: Record<string, TranslationKey> = {
  Applied: 'ov_stage_applied', Shortlisted: 'ov_stage_shortlisted',
  Interview: 'ov_stage_interview', Hired: 'ov_stage_hired',
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, iconBg, trend }: {
  icon: LucideIcon; label: string; value: string | number;
  sub?: string; iconBg: string; trend?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground tabular-nums">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <ArrowUpRight size={11} className="text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{trend}</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-md', iconBg)}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

// ── Funnel Bar ────────────────────────────────────────────────────
function FunnelBar({ label, count, total, barColor, trackColor, emoji }: {
  label: string; count: number; total: number;
  barColor: string; trackColor: string; emoji: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="text-base">{emoji}</span> {label}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tabular-nums text-foreground">{count}</span>
          <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
        </div>
      </div>
      <div className={cn('h-2.5 overflow-hidden rounded-full', trackColor)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)}
          style={{ width: `${pct > 0 ? Math.max(pct, 2) : 0}%` }}
        />
      </div>
    </div>
  );
}

// ── Horizontal Category Bar ───────────────────────────────────────
function HorizBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-xs font-medium text-foreground">{label}</span>
      <div className="flex-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-700 ease-out"
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-xs font-bold tabular-nums text-foreground">{count}</span>
    </div>
  );
}

const STAGE_STYLE: Record<string, string> = {
  Applied:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Shortlisted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Interview:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Hired:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

// ── Main Component ────────────────────────────────────────────────
export function AnalyticsOverview() {
  const { candidates, loading: lcand } = useCandidates();
  const { jobs, loading: ljobs } = useJobs();
  const { data: companies = [] } = useSWR<Company[]>('/api/companies', fetcher, {
    revalidateOnFocus: false,
  });
  const { t } = useLanguage();

  const s = useMemo(() => {
    const applied     = candidates.filter(c => c.stage === 'Applied').length;
    const shortlisted = candidates.filter(c => c.stage === 'Shortlisted').length;
    const interview   = candidates.filter(c => c.stage === 'Interview').length;
    const hired       = candidates.filter(c => c.stage === 'Hired').length;
    const total       = candidates.length;
    const hireRate    = total > 0 ? ((hired / total) * 100).toFixed(1) : '0.0';
    const convRate    = total > 0 ? (((shortlisted + interview + hired) / total) * 100).toFixed(0) : '0';

    const leads    = companies.filter(c => c.status === 'Lead').length;
    const clients  = companies.filter(c => c.status === 'Active' || c.status === 'In-Contract').length;
    const inactive = companies.filter(c => c.status === 'Inactive').length;

    const urgentJobs   = jobs.filter(j => j.isUrgent).length;
    const featuredJobs = jobs.filter(j => j.isFeatured).length;
    const generalPool  = candidates.filter(c =>
      (c.notes ?? '').includes('GENERAL-POOL') || (c.position ?? '').toLowerCase().includes('general pool')
    ).length;

    const catMap: Record<string, number> = {};
    jobs.forEach(j => { catMap[j.category] = (catMap[j.category] || 0) + 1; });
    const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const recent = [...candidates]
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
      .slice(0, 10);

    return {
      applied, shortlisted, interview, hired, total, hireRate, convRate,
      leads, clients, inactive,
      urgentJobs, featuredJobs, generalPool,
      activeJobs: jobs.length, totalCompanies: companies.length,
      topCats, recent,
    };
  }, [candidates, jobs, companies]);

  const loading = lcand || ljobs;

  return (
    <div className="space-y-6">

      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard icon={Users}      label={t('ov_kpi_candidates')}  value={s.total}           sub={t('ov_kpi_sub_pipeline')}        iconBg="bg-brand-600"  />
        <KpiCard icon={Trophy}     label={t('ov_kpi_hired')}       value={s.hired}           sub={`${s.hireRate}${t('ov_suffix_rate')}`} iconBg="bg-emerald-600"/>
        <KpiCard icon={Briefcase}  label={t('ov_kpi_active_jobs')} value={s.activeJobs}      sub={`${s.urgentJobs}${t('ov_suffix_urgent')}`} iconBg="bg-blue-600" />
        <KpiCard icon={Building2}  label={t('ov_kpi_companies')}   value={s.totalCompanies}  sub={t('ov_kpi_sub_in_crm')}                iconBg="bg-violet-600" />
        <KpiCard icon={Target}     label={t('ov_kpi_clients')}     value={s.clients}         sub={t('ov_kpi_sub_paying')}        iconBg="bg-amber-600"  />
        <KpiCard icon={TrendingUp} label={t('ov_kpi_leads')}       value={s.leads}           sub={`${s.convRate}${t('ov_suffix_engaged')}`} iconBg="bg-rose-600" />
      </div>

      {/* ── Charts Row ───────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Candidate Funnel */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">{t('ov_funnel_title')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{s.hireRate}{t('ov_funnel_sub_rate')}</p>
            </div>
            {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
            {!loading && (
              <span className="rounded-xl bg-brand-50 dark:bg-brand-600/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
                {s.total}{t('ov_funnel_total')}
              </span>
            )}
          </div>
          <div className="space-y-4">
            <FunnelBar label={t('ov_stage_applied')}     count={s.applied}     total={s.total} emoji="📥" barColor="bg-blue-500"    trackColor="bg-blue-100 dark:bg-blue-900/20" />
            <FunnelBar label={t('ov_stage_shortlisted')} count={s.shortlisted} total={s.total} emoji="⚡" barColor="bg-amber-500"   trackColor="bg-amber-100 dark:bg-amber-900/20" />
            <FunnelBar label={t('ov_stage_interview')}   count={s.interview}   total={s.total} emoji="🎤" barColor="bg-orange-500"  trackColor="bg-orange-100 dark:bg-orange-900/20" />
            <FunnelBar label={`${t('ov_stage_hired')} ✓`} count={s.hired}      total={s.total} emoji="🏆" barColor="bg-emerald-500" trackColor="bg-emerald-100 dark:bg-emerald-900/20" />
          </div>

          {/* Company Pipeline mini */}
          <div className="mt-6 grid grid-cols-3 gap-2 pt-5 border-t border-border text-center">
            {[
              { label: t('ov_pipeline_leads'),    val: s.leads,    cls: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' },
              { label: t('ov_pipeline_clients'),  val: s.clients,  cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' },
              { label: t('ov_pipeline_inactive'), val: s.inactive, cls: 'bg-muted text-muted-foreground' },
            ].map(({ label, val, cls }) => (
              <div key={label} className={cn('rounded-xl py-2.5 px-2', cls)}>
                <p className="text-xl font-extrabold tabular-nums">{val}</p>
                <p className="text-xs font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Jobs by Category */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">{t('ov_jobs_by_category')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{s.activeJobs}{t('ov_jobs_sub')}{s.featuredJobs}{t('ov_jobs_sub_featured')}</p>
            </div>
            {ljobs && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
          </div>

          {s.topCats.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t('ov_no_jobs')}</p>
          ) : (
            <div className="space-y-3.5">
              {s.topCats.map(([cat, cnt]) => (
                <HorizBar key={cat} label={cat} count={cnt} max={s.topCats[0]?.[1] ?? 1} />
              ))}
            </div>
          )}

          {/* Badges */}
          {(s.urgentJobs > 0 || s.featuredJobs > 0 || s.generalPool > 0) && (
            <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-border">
              {s.urgentJobs > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-900/20 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-400">
                  🔥 {s.urgentJobs}{t('ov_badge_urgent')}
                </span>
              )}
              {s.featuredJobs > 0 && (
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/20 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  ⭐ {s.featuredJobs}{t('ov_badge_featured')}
                </span>
              )}
              {s.generalPool > 0 && (
                <span className="rounded-full bg-brand-100 dark:bg-brand-600/20 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
                  <Inbox size={11} className="inline mr-1" />{s.generalPool}{t('ov_badge_talent_pool')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Applications ───────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-sm font-bold text-foreground">{t('ov_recent_apps_title')}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t('ov_recent_apps_sub')}</p>
          </div>
          <Clock size={15} className="text-muted-foreground" />
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin text-muted-foreground" />
          </div>
        ) : s.recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted-foreground">{t('ov_no_candidates')}</p>
        ) : (
          <div className="divide-y divide-border">
            {s.recent.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-accent/30 transition-colors">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.position || t('ov_general_application')}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STAGE_STYLE[c.stage] ?? STAGE_STYLE.Applied)}>
                    {t(STAGE_KEYS[c.stage] ?? 'ov_stage_applied')}
                  </span>
                  <span className="w-16 text-right text-xs text-muted-foreground">{timeAgo(c.appliedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
