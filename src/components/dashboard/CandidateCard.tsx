import { Phone, Star, Clock, FileText } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Candidate } from '@/types';

function LinkedInIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function MatchBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : score >= 60
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', color)}>
      <Star size={10} />
      {score}%
    </span>
  );
}

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  const { t } = useLanguage();
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm space-y-2.5 select-none transition-colors hover:border-brand-200 dark:hover:border-brand-700/40">

      {/* Name + match score */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-foreground leading-tight line-clamp-1">
          {candidate.name}
        </p>
        {candidate.matchScore > 0 && <MatchBadge score={candidate.matchScore} />}
      </div>

      {/* Position */}
      <p className="text-xs text-muted-foreground truncate font-medium">{candidate.position}</p>

      {/* Phone */}
      {candidate.phone && (
        <a
          href={`tel:${candidate.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Phone size={11} />
          {candidate.phone}
        </a>
      )}

      {/* CV / LinkedIn row */}
      <div className="flex items-center gap-2 pt-0.5">
        {candidate.cvUrl && (
          <a
            href={candidate.cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-600/10 dark:text-brand-300 dark:hover:bg-brand-600/20"
          >
            <FileText size={11} />
            {t('kb_view_cv')}
          </a>
        )}
        {candidate.linkedinUrl && (
          <a
            href={candidate.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 transition-colors"
            aria-label="LinkedIn profile"
          >
            <LinkedInIcon size={13} />
            {t('kb_linkedin')}
          </a>
        )}
      </div>

      {/* Applied date */}
      <p className="flex items-center gap-1 text-xs text-muted-foreground/70">
        <Clock size={10} />
        {t('kb_applied_prefix')}{timeAgo(candidate.appliedAt)}
      </p>
    </div>
  );
}
