'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Briefcase, ChevronDown, ChevronUp, Trash2, MapPin, Clock, AlertTriangle, Loader2, Target } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { cn, timeAgo } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Job } from '@/types';

interface SuggestedCandidate {
  candidateId:     string;
  name:            string;
  phone:           string;
  cityLocation:    string | null;
  experienceYears: string | null;
  score:           number;
  breakdown: {
    skillOverlap:    number;
    keywordMatch:    number;
    locationMatch:   number;
    experienceMatch: number;
  };
  reasons: string[];
}

function scoreColor(score: number): string {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (score >= 40) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-muted text-muted-foreground';
}

// Max points each breakdown factor can contribute -- mirrors the comments
// on MatchBreakdown in src/lib/matching/algorithmicMatch.ts. Kept here
// (not imported) since that file is a pure scoring module with no UI
// dependency, and this is display-only metadata.
const BREAKDOWN_MAX = {
  skillOverlap:    35,
  keywordMatch:    25,
  locationMatch:   20,
  experienceMatch: 20,
} as const;

function MatchBreakdownDetail({ r }: { r: SuggestedCandidate }) {
  const { t } = useLanguage();
  const factors: Array<[keyof SuggestedCandidate['breakdown'], string]> = [
    ['skillOverlap',    t('mj_match_skill_overlap')],
    ['keywordMatch',    t('mj_match_keyword_match')],
    ['locationMatch',   t('mj_match_location_match')],
    ['experienceMatch', t('mj_match_experience_match')],
  ];

  return (
    <div className="space-y-3 border-t border-border/60 bg-muted/10 px-3 py-3">
      <div className="space-y-2">
        {factors.map(([key, label]) => {
          const max = BREAKDOWN_MAX[key];
          const value = r.breakdown[key];
          const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-[10px] font-medium text-muted-foreground">{label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">{value}/{max}</span>
            </div>
          );
        })}
      </div>
      {r.reasons.length > 0 && (
        <ul className="space-y-1">
          {r.reasons.map((reason, i) => (
            <li key={i} className="text-[10px] text-muted-foreground">• {reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestedCandidatesPanel({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<SuggestedCandidate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/suggested-candidates?limit=10`);
        if (!res.ok) { if (!cancelled) setError(true); return; }
        const json = await res.json();
        if (!cancelled) setResults(json.results ?? []);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={16} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-center text-xs text-red-600 dark:text-red-400">{t('mj_suggested_error')}</p>;
  }

  if (results.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">{t('mj_suggested_empty')}</p>;
  }

  return (
    <div className="space-y-1.5 py-2">
      {results.map((r) => {
        const expanded = expandedId === r.candidateId;
        return (
          <div key={r.candidateId} className="overflow-hidden rounded-lg border border-border/60 bg-muted/20">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : r.candidateId)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left"
              aria-expanded={expanded}
            >
              <span className={cn('flex h-8 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold', scoreColor(r.score))}>
                {r.score}%
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{r.name}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {r.cityLocation || '—'}{r.experienceYears ? ` · ${r.experienceYears} yr` : ''}
                </p>
              </div>
              <p className="hidden max-w-[35%] truncate text-[10px] text-muted-foreground sm:block" title={r.reasons.join(' ')}>
                {r.reasons[0]}
              </p>
              {expanded ? <ChevronUp size={14} className="shrink-0 text-muted-foreground" /> : <ChevronDown size={14} className="shrink-0 text-muted-foreground" />}
            </button>
            {expanded && <MatchBreakdownDetail r={r} />}
          </div>
        );
      })}
    </div>
  );
}

function TypeBadge({ type }: { type: Job['type'] }) {
  const colors: Record<Job['type'], string> = {
    'Full-time': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Part-time': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Contract':  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Remote':    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Hybrid':    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', colors[type] ?? colors['Full-time'])}>
      {type}
    </span>
  );
}

function JobRow({
  job,
  onDelete,
}: {
  job: Job;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const { t } = useLanguage();

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setLoading(true);
    await onDelete(job.id);
    setLoading(false);
    setConfirming(false);
  }

  return (
    <div className="rounded-xl border border-border bg-background transition-colors hover:border-border/80">
    <div className="flex items-center gap-3 px-4 py-3">

      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/10 dark:text-brand-400">
        <Briefcase size={16} />
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
          {job.isUrgent   && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">🔥{t('mj_urgent_badge')}</span>}
          {job.isFeatured && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">⭐{t('mj_featured_badge')}</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground font-medium">{job.company}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} /> {job.location}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={10} /> {timeAgo(job.postedAt)}
          </span>
          <TypeBadge type={job.type} />
        </div>
      </div>

      {/* Salary */}
      {job.salaryMax > 0 && (
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold text-foreground">
            {job.salaryMin > 0 ? `${job.salaryMin.toLocaleString()} – ` : ''}
            {job.salaryMax.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">{job.currency}</p>
        </div>
      )}

      {/* Suggested Candidates toggle */}
      <button
        onClick={() => setShowMatches((v) => !v)}
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
          showMatches
            ? 'bg-brand-600 text-white'
            : 'border border-border text-muted-foreground hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-900/20',
        )}
      >
        <Target size={12} />
        <span className="hidden sm:inline">{t('mj_suggested_candidates')}</span>
      </button>

      {/* Delete control */}
      <div className="flex shrink-0 items-center gap-2">
        {confirming && !loading && (
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('mj_cancel')}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
            confirming
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-border text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20',
            loading && 'cursor-not-allowed opacity-60',
          )}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} />
          )}
          {confirming ? t('mj_sure') : t('mj_delete')}
        </button>
      </div>

    </div>
    {showMatches && (
      <div className="border-t border-border px-4">
        <SuggestedCandidatesPanel jobId={job.id} />
      </div>
    )}
    </div>
  );
}

export function JobsPanel() {
  const [open, setOpen] = useState(false);
  // Management view needs the effectively-complete list, not the
  // homepage's paginated 30-at-a-time view — see useJobs.ts's
  // UseJobsOptions.limit doc comment.
  const { jobs, loading, mutate } = useJobs(undefined, undefined, undefined, { limit: 1000 });
  const { t } = useLanguage();

  async function handleDelete(jobId: string) {
    const adminKey = sessionStorage.getItem('lion_admin_key');
    if (!adminKey) {
      toast.error(t('mj_toast_no_admin_key'), {
        description: t('mj_toast_no_admin_key_desc'),
        duration: 5000,
      });
      return;
    }

    // Optimistic update — remove from list immediately
    const prev = jobs;
    mutate(jobs.filter((j) => j.id !== jobId), false);

    try {
      const res  = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method:  'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();

      if (!res.ok) {
        mutate(prev, false);   // rollback
        toast.error(t('mj_toast_delete_failed'), {
          description: json.error ?? t('mj_toast_delete_failed_desc'),
          duration: 4000,
        });
        return;
      }

      toast.success(t('mj_toast_deleted'), {
        description: t('mj_toast_deleted_desc'),
        duration: 3000,
      });
    } catch {
      mutate(prev, false);     // rollback on network error
      toast.error(t('mj_toast_network_error'), {
        description: t('mj_toast_network_error_desc'),
        duration: 4000,
      });
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">

      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Briefcase size={15} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">{t('mj_header_title')}</p>
            <p className="text-xs text-muted-foreground">
              {loading ? t('mj_loading') : `${jobs.length}${t('mj_live_prefix')}${jobs.length === 1 ? t('mj_role_singular') : t('mj_role_plural')}${t('mj_in_sheets_suffix')}`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">

          {/* Warning note */}
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            {t('mj_warning')}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && jobs.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('mj_no_jobs')}</p>
          )}

          {!loading && jobs.length > 0 && (
            <div className="space-y-2">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} onDelete={handleDelete} />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
