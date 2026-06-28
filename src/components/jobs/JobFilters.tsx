'use client';

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

const LOCATIONS = ['Any Location', 'Yangon, Myanmar', 'Mandalay, Myanmar', 'Remote'];

interface Props {
  filters: JobFilters;
  onChange: (patch: Partial<JobFilters>) => void;
  total: number;
}

export function JobFilters({ filters, onChange, total }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Category */}
      <Select
        value={filters.category || '__all__'}
        onValueChange={(v) => onChange({ category: v === '__all__' ? '' : (v as JobCategory) })}
      >
        <SelectTrigger className="h-9 w-full sm:w-44 text-sm bg-background">
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
        <SelectTrigger className="h-9 w-full sm:w-40 text-sm bg-background">
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
        <SelectTrigger className="h-9 w-full sm:w-48 text-sm bg-background">
          <SelectValue placeholder="Any Location" />
        </SelectTrigger>
        <SelectContent>
          {LOCATIONS.map((l) => (
            <SelectItem key={l} value={l === 'Any Location' ? '__any__' : l}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Results count */}
      <span className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
        {total} {total === 1 ? 'role' : 'roles'} found
      </span>
    </div>
  );
}
