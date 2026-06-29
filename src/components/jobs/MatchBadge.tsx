'use client';

import { useMemo } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { computeMatchScore } from '@/lib/skillsMatch';

interface Props {
  requirements: string[];
}

export function MatchBadge({ requirements }: Props) {
  const { profile, hydrated } = useProfile();

  const score = useMemo(() => {
    if (!profile?.skills?.length) return 0;
    return computeMatchScore(requirements, profile.skills);
  }, [requirements, profile]);

  if (!hydrated || score === 0) return null;

  if (score >= 70) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        🎯 {score}% Match
      </span>
    );
  }

  if (score >= 40) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
        ✓ {score}% Match
      </span>
    );
  }

  return null;
}
