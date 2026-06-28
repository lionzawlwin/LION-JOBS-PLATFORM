'use client';

import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JobCategory, JobFilters, JobType } from '@/types';

const CATEGORIES: JobCategory[] = [
  'Engineering', 'Design', 'Marketing', 'Sales',
  'Finance', 'Operations', 'Customer Service', 'Healthcare', 'Education', 'Other',
];

const TYPES: JobType[] = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'];

const LOCATIONS = ['Yangon, Myanmar', 'Mandalay, Myanmar', 'Remote'];

interface Props {
  filters: JobFilters;
  onChange: (patch: Partial<JobFilters>) => void;
  total: number;
}

export function JobFilters({ filters, onChange, total }: Props) {
  const hasActiveFilters = filters.category || filters.type || filters.location;

  function clearAll() {
    onChange({ category: '', type: '', location: '' });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Category */}
      <Select
        value={filters.category || '__all__'}
        onValueChange={(v) => onChange({ category: v === '__all__' ? '' : (v as JobCategory) })}
      >
        <SelectTrigger className="h-10 w-full sm:w-44 text-sm bg-background rounded-xl">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Categories</SelectItem>
          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Type */}
      <Select
        value={filters.type || '__all__'}
        onValueChange={(v) => onChange({ type: v === '__all__' ? '' : (v as JobType) })}
      >
        <SelectTrigger className="h-10 w-full sm:w-40 text-sm bg-background rounded-xl">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All Types</SelectItem>
          {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Location */}
      <Select
        value={filters.location || '__any__'}
        onValueChange={(v) => onChange({ location: v === '__any__' ? '' : (v ?? '') })}
      >
        <SelectTrigger className="h-10 w-full sm:w-48 text-sm bg-background rounded-xl">
          <SelectValue placeholder="Any Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__any__">Any Location</SelectItem>
          {LOCATIONS.map((l) => (
            <SelectItem key={l} value={l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear button */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={13} /> Clear filters
        </button>
      )}

      {/* Results count */}
      <span className="ml-auto text-sm font-medium text-muted-foreground whitespace-nowrap">
        <span className="text-foreground font-bold">{total}</span> {total === 1 ? 'role' : 'roles'} found
      </span>
    </div>
  );
}
