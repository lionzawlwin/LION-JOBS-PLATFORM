'use client';

import useSWR from 'swr';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { StatsHistoryEntry } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface Series {
  label: string;
  color: string;
  values: number[];
}

// Hand-rolled SVG sparkline -- this repo has no charting library and one
// wasn't worth adding for two trend lines (see CTO advisory Layer 5).
// Exported for reuse by SystemHealthView's daily-error-count chart.
export function Sparkline({ series, width = 560, height = 120 }: { series: Series[]; width?: number; height?: number }) {
  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const points = series[0]?.values.length ?? 0;

  if (points < 2) {
    return null;
  }

  const stepX = width / (points - 1);
  const toPath = (values: number[]) =>
    values
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepX).toFixed(1)} ${(height - (v / max) * height).toFixed(1)}`)
      .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Trend chart">
      {series.map((s) => (
        <path key={s.label} d={toPath(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export function TrendChart() {
  const { t } = useLanguage();
  const { data, isLoading } = useSWR<{ history: StatsHistoryEntry[] }>('/api/stats-history', fetcher, {
    revalidateOnFocus: false,
  });

  const history = data?.history ?? [];

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">{t('ov_trend_title')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('ov_trend_sub')}</p>
        </div>
        {isLoading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
      </div>

      {!isLoading && history.length < 2 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{t('ov_trend_empty')}</p>
      ) : (
        <>
          <Sparkline
            series={[
              { label: t('ov_kpi_candidates'), color: 'var(--color-brand-600, #7c3aed)', values: history.map((h) => h.candidatesCount) },
              { label: t('ov_kpi_active_jobs'), color: '#2563eb', values: history.map((h) => h.jobsCount) },
              { label: t('ov_kpi_hired'), color: '#059669', values: history.map((h) => h.hiredCount) },
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-600" />{t('ov_kpi_candidates')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" />{t('ov_kpi_active_jobs')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" />{t('ov_kpi_hired')}</span>
          </div>
        </>
      )}
    </div>
  );
}
