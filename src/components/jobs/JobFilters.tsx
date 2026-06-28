'use client';

import { X, SlidersHorizontal } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { JobCategory, JobFilters, JobType } from '@/types';

const CATEGORIES: JobCategory[] = [
  'Engineering', 'Design', 'Marketing', 'Sales',
  'Finance', 'Operations', 'Customer Service', 'Healthcare', 'Education', 'Other',
];

const TYPES: JobType[] = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'];

const LOCATIONS = ['Yangon, Myanmar', 'Mandalay, Myanmar', 'Remote'];

// @base-ui/react Select can't resolve item labels before SelectContent mounts,
// so "value" renders as raw text (the __all__ bug). Fix: render the trigger
// label explicitly ourselves and use standard "all" / "any" sentinel values.

interface Props {
  filters: JobFilters;
  onChange: (patch: Partial<JobFilters>) => void;
  total: number;
}

export function JobFilters({ filters, onChange, total }: Props) {
  const hasActiveFilters = Boolean(filters.category || filters.type || filters.location);

  function clearAll() {
    onChange({ category: '', type: '', location: '' });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Top row: filter icon + selects + clear ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
          <SlidersHorizontal size={13} />
          Filter
        </div>

        {/* Category */}
        <Select
          value={filters.category || 'all'}
          onValueChange={(v) => onChange({ category: v === 'all' ? '' : (v as JobCategory) })}
        >
          <SelectTrigger className={cn(
            'h-9 w-auto min-w-[130px] rounded-xl text-sm border-border/70 transition-colors',
            filters.category
              ? 'border-brand-600/50 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
              : 'bg-background',
          )}>
            {/* Render text explicitly — avoids @base-ui label-resolution race */}
            <span className={cn('text-sm', !filters.category && 'text-muted-foreground')}>
              {filters.category || 'All Categories'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Type */}
        <Select
          value={filters.type || 'all'}
          onValueChange={(v) => onChange({ type: v === 'all' ? '' : (v as JobType) })}
        >
          <SelectTrigger className={cn(
            'h-9 w-auto min-w-[110px] rounded-xl text-sm border-border/70 transition-colors',
            filters.type
              ? 'border-brand-600/50 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
              : 'bg-background',
          )}>
            <span className={cn('text-sm', !filters.type && 'text-muted-foreground')}>
              {filters.type || 'All Types'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Location */}
        <Select
          value={filters.location || 'any'}
          onValueChange={(v) => onChange({ location: v === 'any' ? '' : (v ?? '') })}
        >
          <SelectTrigger className={cn(
            'h-9 w-auto min-w-[130px] rounded-xl text-sm border-border/70 transition-colors',
            filters.location
              ? 'border-brand-600/50 bg-brand-50 text-brand-700 dark:bg-brand-600/10 dark:text-brand-300'
              : 'bg-background',
          )}>
            <span className={cn('text-sm', !filters.location && 'text-muted-foreground')}>
              {filters.location || 'Any Location'}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Location</SelectItem>
            {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Clear button */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={11} /> Clear all
          </button>
        )}

        {/* Active filter pills */}
        <div className="ml-auto flex items-center gap-1.5">
          {[
            filters.category && { label: filters.category, clear: () => onChange({ category: '' }) },
            filters.type     && { label: filters.type,     clear: () => onChange({ type: '' }) },
            filters.location && { label: filters.location, clear: () => onChange({ location: '' }) },
          ].filter(Boolean).map((pill) => {
            if (!pill) return null;
            return (
              <span
                key={pill.label}
                className="flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-medium text-white"
              >
                {pill.label}
                <button onClick={pill.clear} className="ml-0.5 hover:opacity-70 transition-opacity">
                  <X size={9} />
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Results count ── */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing <span className="font-bold text-foreground">{total}</span>{' '}
          {total === 1 ? 'role' : 'roles'}
          {hasActiveFilters ? ' matching your filters' : ''}
        </span>
      </div>
    </div>
  );
}
