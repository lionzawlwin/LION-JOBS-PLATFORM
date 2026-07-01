'use client';

import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Search, Filter,
  Phone, ExternalLink, Loader2,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useCandidates } from '@/hooks/useCandidates';
import { CandidateDrawer } from './CandidateDrawer';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import type { Candidate, ApplicationStatus } from '@/types';

const STAGE_KEYS: Record<ApplicationStatus, TranslationKey> = {
  Applied: 'ov_stage_applied', Shortlisted: 'ov_stage_shortlisted',
  Interview: 'ov_stage_interview', Hired: 'ov_stage_hired',
};

const PAGE_SIZE = 15;

const STAGE_STYLE: Record<ApplicationStatus, string> = {
  Applied:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-700/30',
  Shortlisted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-700/30',
  Interview:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700/30',
  Hired:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/30',
};

const STAGE_DOT: Record<ApplicationStatus, string> = {
  Applied:     'bg-blue-500',
  Shortlisted: 'bg-amber-500',
  Interview:   'bg-orange-500',
  Hired:       'bg-emerald-500',
};

const ALL_STAGES: (ApplicationStatus | '')[] = ['', 'Applied', 'Shortlisted', 'Interview', 'Hired'];

export function CandidateDataTable() {
  const { candidates, loading, error, updateStage } = useCandidates();
  const [search,   setSearch]   = useState('');
  const [stage,    setStage]    = useState<ApplicationStatus | ''>('');
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const { t } = useLanguage();

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((c) => {
      const matchStage  = !stage  || c.stage === stage;
      const matchSearch = !q
        || c.name.toLowerCase().includes(q)
        || c.position.toLowerCase().includes(q)
        || (c.phone && c.phone.includes(q))
        || (c.email && c.email.toLowerCase().includes(q));
      return matchStage && matchSearch;
    });
  }, [candidates, search, stage]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleStage(v: ApplicationStatus | '') { setStage(v); setPage(1); }

  async function handleStageChange(id: string, newStage: ApplicationStatus) {
    await updateStage(id, newStage);
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, stage: newStage } : null);
  }

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    candidates.forEach((c) => { counts[c.stage] = (counts[c.stage] ?? 0) + 1; });
    return counts;
  }, [candidates]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">

        {/* ── Stage filter pills ─────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {ALL_STAGES.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => handleStage(s)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all',
                stage === s
                  ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                  : 'border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              {s ? t(STAGE_KEYS[s]) : t('cd_all_candidates')}
              {s && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  stage === s ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                )}>
                  {stageCounts[s] ?? 0}
                </span>
              )}
              {!s && (
                <span className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  stage === s ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                )}>
                  {candidates.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Search bar ────────────────────────────────────────── */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('cd_search_placeholder')}
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
          />
        </div>

        {/* ── Table ────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-border">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[32px_1fr_160px_110px_120px_90px_48px] gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>#</span>
            <span>{t('cd_col_candidate')}</span>
            <span>{t('cd_col_position')}</span>
            <span>{t('cd_col_stage')}</span>
            <span>{t('cd_col_phone')}</span>
            <span>{t('cd_col_applied')}</span>
            <span></span>
          </div>

          {pageItems.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <div className="text-center">
                <Filter size={24} className="mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{t('cd_no_match')}</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pageItems.map((c, idx) => {
                const rowNum    = (safePage - 1) * PAGE_SIZE + idx + 1;
                const initials  = c.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className="grid grid-cols-[32px_1fr] sm:grid-cols-[32px_1fr_160px_110px_120px_90px_48px] items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer group"
                  >
                    {/* # */}
                    <span className="text-[11px] font-mono text-muted-foreground">{rowNum}</span>

                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-xs font-bold text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate group-hover:text-brand-600 transition-colors">{c.name}</p>
                        {c.salaryExpected && (
                          <p className="text-[10px] text-muted-foreground truncate">{c.salaryExpected}</p>
                        )}
                        {/* Mobile-only extra info */}
                        <div className="sm:hidden flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', STAGE_STYLE[c.stage])}>
                            {t(STAGE_KEYS[c.stage])}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(c.appliedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Position */}
                    <p className="hidden sm:block text-xs text-muted-foreground truncate">{c.position || '—'}</p>

                    {/* Stage */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      <div className={cn('h-1.5 w-1.5 rounded-full', STAGE_DOT[c.stage])} />
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', STAGE_STYLE[c.stage])}>
                        {t(STAGE_KEYS[c.stage])}
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="hidden sm:flex items-center gap-1.5">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-brand-600 transition-colors"
                        >
                          <Phone size={11} />{c.phone}
                        </a>
                      ) : <span className="text-xs text-muted-foreground/40">—</span>}
                    </div>

                    {/* Applied */}
                    <p className="hidden sm:block text-xs text-muted-foreground">{timeAgo(c.appliedAt)}</p>

                    {/* Action */}
                    <div className="hidden sm:flex items-center justify-end">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground group-hover:border-brand-600/40 group-hover:text-brand-600 transition-all">
                        <ExternalLink size={11} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pagination ────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t('cd_showing')} {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} {t('cd_of')} <strong>{filtered.length}</strong> {t('cd_candidates_word')}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (safePage <= 4) {
                pageNum = i < 6 ? i + 1 : totalPages;
              } else if (safePage >= totalPages - 3) {
                pageNum = i === 0 ? 1 : totalPages - 6 + i;
              } else {
                const mid = [1, safePage - 1, safePage, safePage + 1, totalPages];
                pageNum = mid[i] ?? mid[mid.length - 1];
              }
              return (
                <button
                  key={i}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'h-8 min-w-[2rem] rounded-xl border px-2 text-xs font-semibold transition-all',
                    safePage === pageNum
                      ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <CandidateDrawer
        candidate={selected}
        onClose={() => setSelected(null)}
        onStageChange={handleStageChange}
      />
    </>
  );
}
