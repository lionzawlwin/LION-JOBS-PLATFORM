'use client';

import type { ReactNode } from 'react';

interface Props {
  count: number;
  onClear: () => void;
  children: ReactNode;
}

export function BulkActionBar({ count, onClear, children }: Props) {
  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-700/30 dark:bg-brand-900/20">
      <span className="text-xs font-semibold text-foreground">{count} selected</span>
      {children}
      <button
        onClick={onClear}
        className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        Clear
      </button>
    </div>
  );
}
