'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JobFilters } from '@/types';

interface Props {
  filters: JobFilters;
  onChange: (patch: Partial<JobFilters>) => void;
}

export function SearchBar({ filters, onChange }: Props) {
  const { t } = useLanguage();
  return (
    <div className="relative">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={filters.keyword}
        onChange={(e) => onChange({ keyword: e.target.value })}
        placeholder={t('search_bar_placeholder')}
        className="pl-9 h-11 bg-background text-sm"
      />
    </div>
  );
}
