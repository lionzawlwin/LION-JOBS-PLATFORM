import { Phone, Star, Clock } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
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
    score >= 90
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : score >= 75
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        color,
      )}
    >
      <Star size={10} />
      {score}%
    </span>
  );
}

export function CandidateCard({ candidate }: { candidate: Candidate }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3.5 shadow-sm space-y-2 select-none">
      {/* Name + match score */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-foreground leading-tight">{candidate.name}</p>
        <MatchBadge score={candidate.matchScore} />
      </div>

      {/* Position */}
      <p className="text-xs text-muted-foreground truncate">{candidate.position}</p>

      {/* Phone + LinkedIn */}
      <div className="flex items-center gap-2">
        <a
          href={`tel:${candidate.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Phone size={11} />
          {candidate.phone}
        </a>
        {candidate.linkedinUrl && (
          <a
            href={candidate.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-brand-600 hover:text-brand-700 transition-colors"
            aria-label="LinkedIn profile"
          >
            <LinkedInIcon size={13} />
          </a>
        )}
      </div>

      {/* Applied date */}
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock size={10} />
        Applied {timeAgo(candidate.appliedAt)}
      </p>
    </div>
  );
}
