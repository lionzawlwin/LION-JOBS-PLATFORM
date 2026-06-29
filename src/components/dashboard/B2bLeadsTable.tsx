'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { Search, Loader2, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { B2bLead } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const URGENCY_STYLE: Record<string, string> = {
  'ASAP (within 2 weeks)':          'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/30',
  'Within 1 month':                  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/30',
  'Within 3 months':                 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/30',
  'Planning ahead (3+ months)':      'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600/30',
};

const STATUS_STYLE: Record<string, string> = {
  'New':       'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/30',
  'Contacted': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/30',
  'Qualified': 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/30',
  'Closed':    'bg-muted text-muted-foreground border-border',
};

export function B2bLeadsTable() {
  const { data, isLoading, error } = useSWR<B2bLead[]>('/api/leads', fetcher);
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const leads = data ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter((l) =>
      l.companyName.toLowerCase().includes(q) ||
      l.jobTitle.toLowerCase().includes(q) ||
      l.contactName.toLowerCase().includes(q) ||
      l.industry.toLowerCase().includes(q),
    );
  }, [leads, search]);

  if (isLoading) {
    return (
      <div className="mt-8 flex h-48 items-center justify-center rounded-2xl border border-border">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400">
        Failed to load hiring requests. Check your session or API configuration.
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">B2B Hiring Requests</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Requisitions submitted via the Hire With Us employer portal</p>
        </div>
        <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">{leads.length}</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, role, contact, or industry…"
          className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-14 text-center">
          <Building2 size={28} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {leads.length === 0 ? 'No hiring requests yet. They will appear here when employers submit the Hire With Us form.' : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">

          {/* Column headers */}
          <div className="hidden lg:grid grid-cols-[1fr_150px_130px_130px_90px_110px_40px] gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span>Company & Role</span>
            <span>Contact</span>
            <span>Budget</span>
            <span>Urgency</span>
            <span>Status</span>
            <span>Submitted</span>
            <span />
          </div>

          <div className="divide-y divide-border">
            {filtered.map((lead) => (
              <div key={lead.id}>
                <div
                  onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                  className="grid grid-cols-[1fr_40px] lg:grid-cols-[1fr_150px_130px_130px_90px_110px_40px] items-center gap-3 px-4 py-3.5 cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  {/* Company & Role */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white text-xs font-bold shadow-sm shadow-amber-500/30">
                        {lead.companyName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{lead.companyName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {lead.jobTitle}
                          {lead.headcount && ` · ${lead.headcount} hire${lead.headcount !== '1' ? 's' : ''}`}
                          {lead.workSetup && ` · ${lead.workSetup}`}
                        </p>
                        {/* Mobile-only extras */}
                        <div className="lg:hidden flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            STATUS_STYLE[lead.status] ?? 'bg-muted text-muted-foreground border-border')}>
                            {lead.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(lead.submittedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="hidden lg:block min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{lead.contactName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lead.workEmail}</p>
                  </div>

                  {/* Budget */}
                  <p className="hidden lg:block text-xs text-muted-foreground truncate">{lead.salaryBudget || '—'}</p>

                  {/* Urgency */}
                  <div className="hidden lg:block">
                    <span className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap',
                      URGENCY_STYLE[lead.urgency] ?? 'bg-muted text-muted-foreground border-border',
                    )}>
                      {lead.urgency.split('(')[0].trim()}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden lg:block">
                    <span className={cn(
                      'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                      STATUS_STYLE[lead.status] ?? 'bg-muted text-muted-foreground border-border',
                    )}>
                      {lead.status}
                    </span>
                  </div>

                  {/* Submitted */}
                  <p className="hidden lg:block text-xs text-muted-foreground whitespace-nowrap">{timeAgo(lead.submittedAt)}</p>

                  {/* Expand toggle */}
                  <div className="flex items-center justify-end text-muted-foreground">
                    {expanded === lead.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expanded === lead.id && (
                  <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {lead.requirements && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Key Requirements</p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{lead.requirements}</p>
                        </div>
                      )}
                      {lead.agencyMessage && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Message to Agency</p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{lead.agencyMessage}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                      {lead.location  && <span>📍 {lead.location}</span>}
                      {lead.industry  && <span>🏭 {lead.industry}</span>}
                      {lead.phone     && <span>📞 {lead.phone}</span>}
                      {lead.contactTitle && <span>👤 {lead.contactTitle}</span>}
                      {lead.website   && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                          🌐 Website
                        </a>
                      )}
                      {lead.submittedAt && (
                        <span>📅 {new Date(lead.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
