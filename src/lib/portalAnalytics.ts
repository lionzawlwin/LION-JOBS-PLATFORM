// Company Portal analytics panel upgrade (2026-07-07 session, item #3 of the
// CTO Big Upgrades Portfolio). Pure funnel math, kept isomorphic (no server-
// only imports) so the exact same computation renders the aggregate,
// all-jobs-combined funnel server-side (in /api/company-portal/me) and each
// per-job funnel client-side (from data already in that same response) --
// one implementation, not two copies that could drift.
//
// This app's data model stores only a candidate's CURRENT pipeline stage,
// not a full transition history, so "how many applicants ever reached at
// least X" can't be read directly off a column. But stage progression here
// is strictly forward-only (Applied -> Shortlisted -> Interview -> Hired,
// enforced by the dashboard's own Kanban/stage-dropdown UI), which makes
// cumulative reach reconstructible from today's stage snapshot: everyone
// currently AT or PAST a stage counts as having reached it. Hence
// cumulativeFunnelCounts() sums a stage's raw count with every stage after
// it, rather than treating raw per-stage counts as already cumulative.

export interface StageCounts {
  Applied:     number;
  Shortlisted: number;
  Interview:   number;
  Hired:       number;
}

export interface CumulativeFunnelCounts {
  views:       number;
  applied:     number;
  shortlisted: number;
  interview:   number;
  hired:       number;
}

export function cumulativeFunnelCounts(views: number, stageCounts: StageCounts): CumulativeFunnelCounts {
  return {
    views,
    applied:     stageCounts.Applied + stageCounts.Shortlisted + stageCounts.Interview + stageCounts.Hired,
    shortlisted: stageCounts.Shortlisted + stageCounts.Interview + stageCounts.Hired,
    interview:   stageCounts.Interview + stageCounts.Hired,
    hired:       stageCounts.Hired,
  };
}

export type FunnelStageKey = 'views' | 'applied' | 'shortlisted' | 'interview' | 'hired';

export interface HiringFunnelStage {
  key:   FunnelStageKey;
  count: number;
  // Share of the PREVIOUS stage's count that reached this stage. null (not
  // 0) when the previous stage's count is 0 -- "no data to compute a rate
  // from" is a distinct state from "0% converted," same convention this
  // route already uses for viewToApplyRate/fillRate/avgMatchScore.
  conversionFromPrevious: number | null;
}

export function computeHiringFunnel(counts: CumulativeFunnelCounts): HiringFunnelStage[] {
  const ordered: { key: FunnelStageKey; count: number }[] = [
    { key: 'views',       count: counts.views },
    { key: 'applied',     count: counts.applied },
    { key: 'shortlisted', count: counts.shortlisted },
    { key: 'interview',   count: counts.interview },
    { key: 'hired',       count: counts.hired },
  ];

  return ordered.map((stage, i) => {
    if (i === 0) return { ...stage, conversionFromPrevious: null };
    const previousCount = ordered[i - 1].count;
    return {
      ...stage,
      conversionFromPrevious: previousCount > 0 ? stage.count / previousCount : null,
    };
  });
}
