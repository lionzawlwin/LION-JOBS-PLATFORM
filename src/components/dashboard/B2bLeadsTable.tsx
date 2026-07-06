'use client';

import { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Search, Loader2, Building2, ChevronDown, ChevronRight, CheckCircle2, Trash2, AlertTriangle, UserCheck } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCseReps } from '@/hooks/useCseReps';
import { useSelection } from '@/hooks/useSelection';
import { summarizeBulkResults } from '@/lib/bulkActions';
import { BulkActionBar } from './BulkActionBar';
import type { TranslationKey } from '@/lib/i18n';
import type { B2bLead, CseRep } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const URGENCY_STYLE: Record<string, string> = {
  'ASAP (within 2 weeks)':      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/30',
  'Within 1 month':              'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/30',
  'Within 3 months':             'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/30',
  'Planning ahead (3+ months)':  'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600/30',
};
const URGENCY_KEYS: Record<string, TranslationKey> = {
  'ASAP (within 2 weeks)':      'lead_urgency_asap',
  'Within 1 month':              'lead_urgency_1month',
  'Within 3 months':             'lead_urgency_3months',
  'Planning ahead (3+ months)':  'lead_urgency_planning',
};

const STATUS_OPTIONS = ['New', 'In Review', 'Pending', 'Active', 'Interview', 'Placed', 'On Hold', 'Rejected', 'Closed'] as const;
type LeadStatus = typeof STATUS_OPTIONS[number];

const STATUS_STYLE: Record<string, string> = {
  'New':       'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/30',
  'In Review': 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700/30',
  'Pending':   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/30',
  'Active':    'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/30',
  'Interview': 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700/30',
  'Placed':    'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700/30',
  'On Hold':   'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/30',
  'Rejected':  'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/30',
  'Closed':    'bg-muted text-muted-foreground border-border',
};
const STATUS_KEYS: Record<string, TranslationKey> = {
  'New': 'lead_status_new', 'In Review': 'lead_status_in_review', 'Pending': 'lead_status_pending',
  'Active': 'lead_status_active', 'Interview': 'lead_status_interview', 'Placed': 'lead_status_placed',
  'On Hold': 'lead_status_on_hold', 'Rejected': 'lead_status_rejected', 'Closed': 'lead_status_closed',
};

function StatusCell({ lead }: { lead: B2bLead }) {
  const [editing,  setEditing]  = useState(false);
  const [selected, setSelected] = useState<string>(lead.status || 'New');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const { t } = useLanguage();

  async function save() {
    if (selected === lead.status) { setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: selected }),
      });
      if (res.ok) {
        setSaved(true);
        mutate('/api/leads');
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('[B2bLeadsTable] status update error:', err);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          autoFocus
          className="rounded-lg border border-brand-300 bg-background px-2 py-1 text-[11px] font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{t(STATUS_KEYS[s])}</option>
          ))}
        </select>
        <button
          onClick={save}
          disabled={saving}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(false); setSelected(lead.status || 'New'); }}
          className="rounded-lg border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-accent transition-colors"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title={t('bl_click_to_change_status')}
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all hover:ring-2 hover:ring-brand-600/30 hover:ring-offset-1 cursor-pointer',
        STATUS_STYLE[selected] ?? 'bg-muted text-muted-foreground border-border',
      )}
    >
      {saved ? t('bl_saved') : t(STATUS_KEYS[selected] ?? 'lead_status_new')}
    </button>
  );
}

function DeleteLeadButton({ lead }: { lead: B2bLead }) {
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { t } = useLanguage();

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      if (res.ok) mutate('/api/leads');
    } catch (err) {
      console.error('[B2bLeadsTable] delete error:', err);
    } finally {
      setDeleting(false);
      setConfirm(false);
    }
  }

  if (confirm) {
    return (
      <div
        className="flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-2 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <AlertTriangle size={11} className="text-red-600 dark:text-red-400 shrink-0" />
        <span className="text-[10px] text-red-700 dark:text-red-400 font-medium">{t('cdw_delete_confirm')}</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={10} className="animate-spin" /> : t('ent_row_confirm_yes')}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirm(false); }}
          className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent"
        >
          {t('ent_row_confirm_no')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirm(true); }}
      title={t('bl_delete_request_title')}
      className="flex h-7 w-7 items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
    >
      <Trash2 size={13} />
    </button>
  );
}

// Previously there was no way to claim an unclaimed lead at all through the
// UI -- the only path that ever set claimed_by_cse_rep_id was an invisible
// side effect of a cse-role user changing status, which never fires for
// owner/admin. Reuses the already-fetched cseReps list: a cse picking their
// own name claims it, an owner/admin picking someone else dispatches it.
function ClaimLeadControl({ lead, cseReps }: { lead: B2bLead; cseReps: CseRep[] }) {
  const [assigning, setAssigning] = useState(false);
  const { t } = useLanguage();

  async function handleAssign(cseRepId: string) {
    if (!cseRepId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/claim`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cseRepId }),
      });
      if (res.ok) mutate('/api/leads');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <select
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => handleAssign(e.target.value)}
      value=""
      disabled={assigning || cseReps.length === 0}
      title={t('bl_claim_lead_title')}
      className="rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 hover:bg-violet-50 disabled:opacity-50 transition-colors dark:border-violet-700/40 dark:bg-violet-900/10 dark:text-violet-400"
    >
      <option value="" disabled>{assigning ? '…' : t('bl_claim_lead')}</option>
      {cseReps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

function ReleaseLeadButton({ lead }: { lead: B2bLead }) {
  const [releasing, setReleasing] = useState(false);
  const { t } = useLanguage();

  async function handleRelease(e: React.MouseEvent) {
    e.stopPropagation();
    setReleasing(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/release`, { method: 'PATCH' });
      if (res.ok) mutate('/api/leads');
    } catch (err) {
      console.error('[B2bLeadsTable] release error:', err);
    } finally {
      setReleasing(false);
    }
  }

  return (
    <button
      onClick={handleRelease}
      disabled={releasing}
      title={t('bl_release_claim_title')}
      className="rounded-lg border border-violet-200 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 hover:bg-violet-50 disabled:opacity-50 transition-colors dark:border-violet-700/40 dark:text-violet-400 dark:hover:bg-violet-900/20"
    >
      {releasing ? <Loader2 size={10} className="animate-spin" /> : t('bl_release_claim')}
    </button>
  );
}

export function B2bLeadsTable() {
  const { data, isLoading, error } = useSWR<B2bLead[]>('/api/leads', fetcher);
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<string>('New');
  const [bulkBusy, setBulkBusy] = useState(false);
  const selection = useSelection<string>();
  const { t } = useLanguage();
  const { cseReps } = useCseReps();

  const cseNameById = useMemo(() => new Map(cseReps.map((c) => [c.id, c.name])), [cseReps]);
  const leads = data ?? [];

  // StatusCell's own single-lead PATCH has no toast (just a visual
  // checkmark) -- bulk needs an explicit summary since there's no
  // per-row feedback surface for a batch of updates.
  async function handleBulkStatusApply() {
    setBulkBusy(true);
    const results = await Promise.allSettled(
      Array.from(selection.selected).map(async (id): Promise<boolean> => {
        const res = await fetch(`/api/leads/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: bulkStatus }),
        });
        return res.ok;
      }),
    );
    mutate('/api/leads');
    const { succeeded, failed } = summarizeBulkResults(results);
    if (failed === 0) {
      toast.success(`Updated ${succeeded} lead${succeeded === 1 ? '' : 's'}.`);
    } else {
      toast.error(`Updated ${succeeded}, failed to update ${failed}.`);
    }
    setBulkBusy(false);
    selection.clear();
  }

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
      <div className="flex h-48 items-center justify-center rounded-2xl border border-border">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400">
        {t('bl_load_error')}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">{t('admin_tab_b2b_leads')}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('bl_header_sub')}
          </p>
        </div>
        <span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">{leads.length}</span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('bl_search_placeholder')}
          className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors"
        />
      </div>

      {/* Bulk action bar */}
      {selection.count > 0 && (
        <BulkActionBar count={selection.count} onClear={selection.clear}>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(STATUS_KEYS[s])}</option>)}
          </select>
          <button
            onClick={handleBulkStatusApply}
            disabled={bulkBusy}
            className="rounded-xl border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Apply
          </button>
        </BulkActionBar>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-14 text-center">
          <Building2 size={28} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {leads.length === 0
              ? t('bl_no_leads')
              : t('bl_no_search_results')}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">

          {/* Column headers */}
          <div className="hidden lg:flex items-center gap-2 border-b border-border bg-muted/50 px-2 py-2.5">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every((l) => selection.isSelected(l.id))}
              onChange={() => selection.toggleAll(filtered.map((l) => l.id))}
              className="ml-2"
            />
            <div className="grid flex-1 grid-cols-[1fr_150px_130px_130px_120px_110px_36px_36px] gap-3 pr-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>{t('bl_col_company_role')}</span>
              <span>{t('bl_col_contact')}</span>
              <span>{t('bl_col_budget')}</span>
              <span>{t('bl_col_urgency')}</span>
              <span>{t('bl_col_status')}</span>
              <span>{t('bl_col_submitted')}</span>
              <span />
              <span />
            </div>
          </div>

          <div className="divide-y divide-border">
            {filtered.map((lead) => (
              <div key={lead.id}>
                <div className="flex items-center gap-2 px-2 hover:bg-accent/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={selection.isSelected(lead.id)}
                    onChange={() => selection.toggle(lead.id)}
                    className="ml-2 shrink-0"
                  />
                  <div
                    onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}
                    className="grid flex-1 min-w-0 grid-cols-[1fr_36px_36px] lg:grid-cols-[1fr_150px_130px_130px_120px_110px_36px_36px] items-center gap-3 py-3.5 pr-2 cursor-pointer"
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
                          {lead.headcount && ` · ${lead.headcount} ${lead.headcount !== '1' ? t('bl_hire_plural') : t('bl_hire_singular')}`}
                          {lead.workSetup && ` · ${lead.workSetup}`}
                        </p>
                        {lead.claimedByCseRepId ? (
                          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
                            <UserCheck size={10} />
                            {t('bl_claimed_by')}: {cseNameById.get(lead.claimedByCseRepId) ?? lead.claimedByCseRepId}
                            <span onClick={(e) => e.stopPropagation()}>
                              <ReleaseLeadButton lead={lead} />
                            </span>
                          </p>
                        ) : (
                          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                            <ClaimLeadControl lead={lead} cseReps={cseReps} />
                          </div>
                        )}
                        {/* Mobile: status + time */}
                        <div className="lg:hidden flex items-center gap-2 mt-1 flex-wrap">
                          <StatusCell lead={lead} />
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
                      {URGENCY_KEYS[lead.urgency] ? t(URGENCY_KEYS[lead.urgency]) : lead.urgency.split('(')[0].trim()}
                    </span>
                  </div>

                  {/* Status (clickable) */}
                  <div className="hidden lg:flex items-center">
                    <StatusCell lead={lead} />
                  </div>

                  {/* Submitted */}
                  <p className="hidden lg:block text-xs text-muted-foreground whitespace-nowrap">{timeAgo(lead.submittedAt)}</p>

                  {/* Delete */}
                  <div className="flex items-center justify-end">
                    <DeleteLeadButton lead={lead} />
                  </div>

                  {/* Expand toggle */}
                  <div className="flex items-center justify-end text-muted-foreground">
                    {expanded === lead.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {expanded === lead.id && (
                  <div className="border-t border-border bg-muted/20 px-4 pb-5 pt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {lead.requirements && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('bl_key_requirements')}</p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{lead.requirements}</p>
                        </div>
                      )}
                      {lead.jobDescription && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('bl_job_description')}</p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{lead.jobDescription}</p>
                        </div>
                      )}
                      {lead.benefits && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('bl_benefits_perks')}</p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{lead.benefits}</p>
                        </div>
                      )}
                      {lead.agencyMessage && (
                        <div>
                          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('bl_message_to_agency')}</p>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{lead.agencyMessage}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                      {lead.location      && <span>📍 {lead.location}</span>}
                      {lead.industry      && <span>🏭 {lead.industry}</span>}
                      {lead.phone         && <span>📞 {lead.phone}</span>}
                      {lead.contactTitle  && <span>👤 {lead.contactTitle}</span>}
                      {lead.website       && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                          🌐 {t('bl_website')}
                        </a>
                      )}
                      {lead.submittedAt   && (
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
