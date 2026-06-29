'use client';

import { Bookmark } from 'lucide-react';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { cn } from '@/lib/utils';

interface Props {
  jobId: string;
  className?: string;
}

export function SaveButton({ jobId, className }: Props) {
  const { isSaved, toggleSave } = useSavedJobs();
  const saved = isSaved(jobId);

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(jobId); }}
      aria-label={saved ? 'Remove from saved jobs' : 'Save this job'}
      title={saved ? 'Remove from saved jobs' : 'Save this job'}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border',
        'transition-colors',
        saved
          ? 'border-brand-400 bg-brand-50 text-brand-600 dark:border-brand-600/40 dark:bg-brand-600/10 dark:text-brand-400'
          : 'text-muted-foreground hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:hover:border-brand-600/40 dark:hover:bg-brand-600/10 dark:hover:text-brand-400',
        className,
      )}
    >
      <Bookmark size={13} className={cn(saved && 'fill-current')} />
    </button>
  );
}
