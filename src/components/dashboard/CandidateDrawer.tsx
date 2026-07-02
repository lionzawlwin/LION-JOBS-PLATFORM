'use client';

import { useEffect, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  X, Phone, Mail, Briefcase, DollarSign,
  Calendar, FileText, Star, ExternalLink, Clock,
  Download, Link2, Loader2, Pencil, Unlink, CheckCircle2,
  Trash2, AlertTriangle, MapPin, GraduationCap, Globe,
  Languages, Zap, Building2, Bot, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import type { Candidate, ApplicationStatus, Job, Company, Invoice } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function proxyDownloadUrl(rawUrl: string): string {
  return `/api/download?url=${encodeURIComponent(rawUrl)}`;
}

const STAGE_KEYS: Record<ApplicationStatus, TranslationKey> = {
  Applied: 'ov_stage_applied', Shortlisted: 'ov_stage_shortlisted',
  Interview: 'ov_stage_interview', Hired: 'ov_stage_hired',
};

const STAGE_STYLE: Record<ApplicationStatus, string> = {
  Applied:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Shortlisted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Interview:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  Hired:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const STAGE_DOT: Record<ApplicationStatus, string> = {
  Applied:     'bg-blue-500',
  Shortlisted: 'bg-amber-500',
  Interview:   'bg-orange-500',
  Hired:       'bg-emerald-500',
};

interface Props {
  candidate: Candidate | null;
  onClose: () => void;
  onStageChange?: (id: string, stage: ApplicationStatus) => void;
  onDelete?: (id: string) => void;
}

const STAGES: ApplicationStatus[] = ['Applied', 'Shortlisted', 'Interview', 'Hired'];

export function CandidateDrawer({ candidate, onClose, onStageChange, onDelete }: Props) {
  const { data: jobs = [] } = useSWR<Job[]>('/api/jobs', fetcher);
  const [linkJobId,    setLinkJobId]    = useState('');
  const [linking,      setLinking]      = useState(false);
  const [jobEditMode,  setJobEditMode]  = useState(false);
  const [linkedJob,    setLinkedJob]    = useState<{ id: string; title: string; company: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);
  // CV URL editing
  const [cvUrlEdit,    setCvUrlEdit]    = useState(false);
  const [cvUrlValue,   setCvUrlValue]   = useState('');
  const [savingCvUrl,  setSavingCvUrl]  = useState(false);
  // Interview details editing
  const [interviewEditMode,     setInterviewEditMode]     = useState(false);
  const [interviewLocationVal,  setInterviewLocationVal]  = useState('');
  const [interviewerContactVal, setInterviewerContactVal] = useState('');
  const [savingInterview,       setSavingInterview]       = useState(false);
  const { data: consentData } = useSWR<{ consent: { agreedAt: string; termsVersion: string } | null }>(
    candidate && candidate.stage === 'Interview' ? `/api/candidates/${candidate.id}/consent` : null,
    fetcher,
  );
  // Billing: final salary editing + invoice generation
  const [finalSalaryEditMode, setFinalSalaryEditMode] = useState(false);
  const [finalSalaryVal,      setFinalSalaryVal]       = useState('');
  const [savingFinalSalary,   setSavingFinalSalary]    = useState(false);
  const [invoiceCompanyId,    setInvoiceCompanyId]     = useState('');
  const [generatingInvoice,   setGeneratingInvoice]    = useState(false);
  const { data: companiesForInvoice = [] } = useSWR<Company[]>(
    candidate && candidate.stage === 'Hired' ? '/api/companies' : null,
    fetcher,
  );
  const { data: invoiceData } = useSWR<{ invoice: Invoice | null }>(
    candidate && candidate.stage === 'Hired' ? `/api/candidates/${candidate.id}/invoice` : null,
    fetcher,
  );
  const { t } = useLanguage();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (candidate) {
      document.body.style.overflow = 'hidden';
      setLinkJobId('');
      setJobEditMode(false);
      setConfirmDelete(false);
      setCvUrlEdit(false);
      setCvUrlValue(candidate.cvUrl ?? '');
      setInterviewLocationVal(candidate.interviewLocation ?? '');
      setInterviewerContactVal(candidate.interviewerContact ?? '');
      setInterviewEditMode(false);
      setFinalSalaryVal(candidate.finalAgreedSalary != null ? String(candidate.finalAgreedSalary) : '');
      setFinalSalaryEditMode(false);
      setInvoiceCompanyId('');
      if (candidate.jobId) {
        const matched = jobs.find((j) => j.id === candidate.jobId);
        setLinkedJob(matched
          ? { id: matched.id, title: matched.title, company: matched.company }
          : { id: candidate.jobId, title: candidate.position || 'Unknown', company: candidate.company || '' },
        );
      } else {
        setLinkedJob(null);
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [candidate, jobs]);

  useEffect(() => {
    if (candidate?.company && companiesForInvoice.length > 0 && !invoiceCompanyId) {
      const match = companiesForInvoice.find(
        (c) => c.name.toLowerCase() === candidate.company?.toLowerCase(),
      );
      if (match) setInvoiceCompanyId(match.id);
    }
  }, [candidate, companiesForInvoice, invoiceCompanyId]);

  async function handleLinkJob() {
    if (!linkJobId || !candidate) return;
    const job = jobs.find((j) => j.id === linkJobId);
    if (!job) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/job`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ jobId: job.id, jobTitle: job.title, company: job.company }),
      });
      if (res.ok) { setLinkedJob({ id: job.id, title: job.title, company: job.company }); setJobEditMode(false); setLinkJobId(''); }
    } catch (err) { console.error('[CandidateDrawer] job link error:', err); }
    finally { setLinking(false); }
  }

  async function handleClearJob() {
    if (!candidate) return;
    setLinking(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/job`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clear: true, jobTitle: '', jobId: '', company: '' }),
      });
      if (res.ok) { setLinkedJob(null); setJobEditMode(false); setLinkJobId(''); }
    } catch (err) { console.error('[CandidateDrawer] job clear error:', err); }
    finally { setLinking(false); }
  }

  async function handleDelete() {
    if (!candidate) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, { method: 'DELETE' });
      if (res.ok) {
        globalMutate('/api/candidates');
        onDelete?.(candidate.id);
        onClose();
      }
    } catch (err) { console.error('[CandidateDrawer] delete error:', err); }
    finally { setDeleting(false); }
  }

  async function handleSaveCvUrl() {
    if (!candidate) return;
    setSavingCvUrl(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/cv-url`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ cvUrl: cvUrlValue }),
      });
      if (res.ok) {
        globalMutate('/api/candidates');
        setCvUrlEdit(false);
      }
    } catch (err) { console.error('[CandidateDrawer] cv-url update error:', err); }
    finally { setSavingCvUrl(false); }
  }

  async function handleSaveInterviewDetails() {
    if (!candidate) return;
    setSavingInterview(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/interview`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          interviewLocation:  interviewLocationVal,
          interviewerContact: interviewerContactVal,
        }),
      });
      if (res.ok) {
        globalMutate('/api/candidates');
        setInterviewEditMode(false);
      }
    } catch (err) { console.error('[CandidateDrawer] interview details update error:', err); }
    finally { setSavingInterview(false); }
  }

  async function handleSaveFinalSalary() {
    if (!candidate) return;
    const parsed = Number(finalSalaryVal);
    if (!finalSalaryVal || Number.isNaN(parsed) || parsed < 0) return;
    setSavingFinalSalary(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/final-salary`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ finalAgreedSalary: parsed }),
      });
      if (res.ok) {
        globalMutate('/api/candidates');
        setFinalSalaryEditMode(false);
      }
    } catch (err) { console.error('[CandidateDrawer] final salary update error:', err); }
    finally { setSavingFinalSalary(false); }
  }

  async function handleGenerateInvoice() {
    // candidate.finalAgreedSalary can still be stale here if the drawer hasn't
    // been reopened since handleSaveFinalSalary last succeeded (globalMutate
    // revalidates the parent's candidate list, but doesn't replace this
    // component's `candidate` prop in place) — fall back to the local input
    // value, mirroring the effectiveCvUrl/effectiveInterviewLocation pattern
    // used elsewhere in this file for the same staleness gap.
    const effectiveSalary = candidate?.finalAgreedSalary ?? (finalSalaryVal ? Number(finalSalaryVal) : undefined);
    if (!candidate || !effectiveSalary || !invoiceCompanyId) return;
    const candidateId = candidate.id; // pin before the async gap — candidate can change while this POST is in flight
    setGeneratingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          applicationId: candidate.id,
          candidateName: candidate.name,
          position:      candidate.position,
          companyId:     invoiceCompanyId,
          agreedSalary:  effectiveSalary,
        }),
      });
      if (res.ok) {
        globalMutate(`/api/candidates/${candidateId}/invoice`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Could not generate invoice.');
      }
    } catch (err) {
      console.error('[CandidateDrawer] generate invoice error:', err);
    } finally {
      setGeneratingInvoice(false);
    }
  }

  if (!candidate) return null;

  const initials = candidate.name
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  const effectiveCvUrl = cvUrlEdit ? undefined : (candidate.cvUrl || cvUrlValue || undefined);
  const effectiveInterviewLocation  = interviewEditMode ? undefined : (candidate.interviewLocation  || interviewLocationVal  || undefined);
  const effectiveInterviewerContact = interviewEditMode ? undefined : (candidate.interviewerContact || interviewerContactVal || undefined);
  // Same staleness gap as effectiveCvUrl above: globalMutate('/api/candidates')
  // revalidates the parent's list but doesn't replace this drawer's `candidate`
  // prop in place, so immediately after a first-time save the invoice section
  // below would otherwise stay stuck on the disabled placeholder until the
  // drawer is closed and reopened. Fall back to the local input value.
  const effectiveFinalAgreedSalary = candidate.finalAgreedSalary ?? (finalSalaryVal ? Number(finalSalaryVal) : undefined);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-hidden bg-background shadow-2xl border-l border-border animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-xl font-extrabold text-white shadow-lg shadow-brand-600/30">
              {initials}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-foreground">{candidate.name}</h2>
              <p className="text-sm text-muted-foreground">{candidate.position || t('ov_general_application')}</p>
              {candidate.cityLocation && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin size={10} /> {candidate.cityLocation}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                title={t('cdw_delete_candidate')}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-2 py-1">
                <AlertTriangle size={12} className="text-red-600 dark:text-red-400 shrink-0" />
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">{t('cdw_delete_confirm')}</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={10} className="animate-spin" /> : t('ent_row_confirm_yes')}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                >
                  {t('ent_row_confirm_no')}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

          {/* Stage badge + changer */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className={cn('h-2 w-2 rounded-full', STAGE_DOT[candidate.stage])} />
              <span className={cn('rounded-full px-3 py-1 text-xs font-bold', STAGE_STYLE[candidate.stage])}>
                {t(STAGE_KEYS[candidate.stage])}
              </span>
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} /> {timeAgo(candidate.appliedAt)}
              </span>
            </div>

            {onStageChange && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cdw_move_to_stage')}</p>
                <div className="flex gap-2">
                  {STAGES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onStageChange(candidate.id, s)}
                      disabled={s === candidate.stage}
                      className={cn(
                        'flex-1 rounded-xl border py-2 text-xs font-semibold transition-all',
                        s === candidate.stage
                          ? 'border-foreground/20 bg-foreground/5 text-muted-foreground cursor-default'
                          : 'border-border text-muted-foreground hover:border-brand-600 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-600/10 dark:hover:text-brand-300',
                      )}
                    >
                      {t(STAGE_KEYS[s])}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Job Assignment */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Link2 size={11} /> {t('cdw_job_requisition')}
              </p>
              {linkedJob && !jobEditMode && (
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-700/30 dark:bg-brand-600/10 px-4 py-3">
                  <CheckCircle2 size={16} className="shrink-0 text-brand-600 dark:text-brand-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-brand-700 dark:text-brand-300 truncate">{linkedJob.title}</p>
                    {linkedJob.company && <p className="text-[11px] text-brand-600/70 dark:text-brand-400/70">{linkedJob.company}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setJobEditMode(true); setLinkJobId(linkedJob.id); }} title={t('cdw_change_job')} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-brand-600 hover:border-brand-300 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={handleClearJob} disabled={linking} title={t('cdw_remove_link')} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40">
                      {linking ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                    </button>
                  </div>
                </div>
              )}
              {(!linkedJob || jobEditMode) && jobs.length > 0 && (
                <div className="flex gap-2">
                  <select value={linkJobId} onChange={(e) => setLinkJobId(e.target.value)} className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors">
                    <option value="">{t('cdw_select_job')}</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                  </select>
                  <button onClick={handleLinkJob} disabled={!linkJobId || linking} className="flex items-center gap-1.5 rounded-xl border border-brand-600 bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
                    {linking ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                    {jobEditMode ? t('cdw_update') : t('cdw_assign')}
                  </button>
                  {jobEditMode && (
                    <button onClick={() => { setJobEditMode(false); setLinkJobId(''); }} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors">{t('cdw_cancel')}</button>
                  )}
                </div>
              )}
              {!linkedJob && !jobEditMode && jobs.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('cdw_no_jobs_posted')}</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border">
            <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cdw_contact_details')}</p>
            {candidate.phone && (
              <a href={`tel:${candidate.phone}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
                <Phone size={14} className="text-muted-foreground group-hover:text-brand-600" />
                <span className="text-sm font-medium text-foreground group-hover:text-brand-600">{candidate.phone}</span>
              </a>
            )}
            {candidate.email && (
              <a href={`mailto:${candidate.email}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
                <Mail size={14} className="text-muted-foreground group-hover:text-brand-600" />
                <span className="text-sm text-foreground group-hover:text-brand-600">{candidate.email}</span>
              </a>
            )}
            {candidate.portfolioUrl && (
              <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
                <Globe size={14} className="text-muted-foreground group-hover:text-brand-600" />
                <span className="text-sm text-foreground group-hover:text-brand-600 truncate">{candidate.portfolioUrl}</span>
                <ExternalLink size={11} className="ml-auto text-muted-foreground group-hover:text-brand-600 shrink-0" />
              </a>
            )}
          </div>

          {/* Professional Profile */}
          {(candidate.education || candidate.experienceYears || candidate.currentCompany ||
            candidate.currentSalary || candidate.languages || candidate.skills) && (
            <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border">
              <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cdw_professional_profile')}</p>
              {candidate.education && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <GraduationCap size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('cdw_education')}</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.education}</p>
                  </div>
                </div>
              )}
              {candidate.experienceYears && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Briefcase size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('cdw_experience')}</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.experienceYears}{t('cdw_years_suffix')}</p>
                  </div>
                </div>
              )}
              {candidate.currentCompany && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Building2 size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('cdw_current_employer')}</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.currentCompany}</p>
                  </div>
                </div>
              )}
              {candidate.currentSalary && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <DollarSign size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('cdw_current_salary')}</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.currentSalary}</p>
                  </div>
                </div>
              )}
              {candidate.languages && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Languages size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('cdw_languages')}</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.languages}</p>
                  </div>
                </div>
              )}
              {candidate.skills && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Zap size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">{t('cdw_key_skills')}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {candidate.skills.split(',').map((s) => s.trim()).filter(Boolean).map((skill) => (
                        <span key={skill} className="rounded-lg border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Role Details */}
          <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border">
            <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cdw_role_details')}</p>
            {candidate.position && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Briefcase size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">{t('cdw_applied_position')}</p><p className="text-sm font-semibold text-foreground">{candidate.position}</p></div>
              </div>
            )}
            {candidate.salaryExpected && (
              <div className="flex items-center gap-3 px-4 py-3">
                <DollarSign size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">{t('cdw_expected_salary')}</p><p className="text-sm font-semibold text-foreground">{candidate.salaryExpected}</p></div>
              </div>
            )}
            {candidate.notes && candidate.notes.includes('notice_period:') === false && candidate.company && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">{t('cdw_company')}</p><p className="text-sm font-semibold text-foreground">{candidate.company}</p></div>
              </div>
            )}
            {candidate.interviewDate && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">{t('cdw_interview_date')}</p><p className="text-sm font-semibold text-foreground">{candidate.interviewDate}</p></div>
              </div>
            )}
            {candidate.stage === 'Interview' && (
              <div className="space-y-2 px-4 py-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t('cdw_interview_details')}</p>
                  {consentData?.consent ? (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      {t('cdw_consent_agreed_prefix')}{new Date(consentData.consent.agreedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600">{t('cdw_consent_pending')}</span>
                  )}
                </div>
                {interviewEditMode ? (
                  <>
                    <input
                      value={interviewLocationVal}
                      onChange={(e) => setInterviewLocationVal(e.target.value)}
                      placeholder={t('cdw_interview_location_placeholder')}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <input
                      value={interviewerContactVal}
                      onChange={(e) => setInterviewerContactVal(e.target.value)}
                      placeholder={t('cdw_interviewer_contact_placeholder')}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveInterviewDetails}
                        disabled={savingInterview}
                        className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingInterview ? t('cdw_saving') : t('cdw_save')}
                      </button>
                      <button
                        onClick={() => setInterviewEditMode(false)}
                        className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground"
                      >
                        {t('cdw_cancel')}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setInterviewEditMode(true)}
                    className="flex items-center gap-1 text-left text-xs text-muted-foreground hover:text-foreground"
                  >
                    {effectiveInterviewLocation
                      ? <><MapPin size={11} className="shrink-0" /> {effectiveInterviewLocation}{effectiveInterviewerContact ? ` · ${effectiveInterviewerContact}` : ''} ({t('cdw_edit_suffix')})</>
                      : t('cdw_set_interview_details')}
                  </button>
                )}
              </div>
            )}
            {candidate.stage === 'Hired' && (
              <div className="space-y-2 px-4 py-3 border-t border-border/50">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t('cdw_billing_section')}</p>

                {finalSalaryEditMode ? (
                  <>
                    <input
                      type="number"
                      value={finalSalaryVal}
                      onChange={(e) => setFinalSalaryVal(e.target.value)}
                      placeholder={t('cdw_final_salary_placeholder')}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveFinalSalary}
                        disabled={savingFinalSalary}
                        className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingFinalSalary ? t('cdw_saving') : t('cdw_save')}
                      </button>
                      <button
                        onClick={() => setFinalSalaryEditMode(false)}
                        className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground"
                      >
                        {t('cdw_cancel')}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setFinalSalaryEditMode(true)}
                    className="text-left text-xs text-muted-foreground hover:text-foreground"
                  >
                    {effectiveFinalAgreedSalary
                      ? <>{t('cdw_final_salary_label')}: {effectiveFinalAgreedSalary.toLocaleString()} ({t('cdw_edit_suffix')})</>
                      : t('cdw_final_salary_label')}
                  </button>
                )}

                {effectiveFinalAgreedSalary ? (
                  invoiceData?.invoice ? (
                    <a
                      href={`/dashboard/billing/invoice/${invoiceData.invoice.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex w-fit items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      {t('cdw_view_invoice')}
                    </a>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <select
                        value={invoiceCompanyId}
                        onChange={(e) => setInvoiceCompanyId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      >
                        <option value="">{t('cdw_select_company')}</option>
                        {companiesForInvoice.map((co) => (
                          <option key={co.id} value={co.id}>{co.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleGenerateInvoice}
                        disabled={!invoiceCompanyId || generatingInvoice}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {generatingInvoice ? t('cdw_generating') : t('cdw_generate_invoice')}
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    disabled
                    title={t('cdw_final_salary_label')}
                    className="mt-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground opacity-60"
                  >
                    {t('cdw_generate_invoice')}
                  </button>
                )}
              </div>
            )}
            {candidate.source && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Star size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">{t('cdw_source')}</p><p className="text-sm font-semibold text-foreground">{candidate.source}</p></div>
              </div>
            )}
          </div>

          {/* Applied date */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cdw_applied')}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {new Date(candidate.appliedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          {/* AI Analysis card */}
          {candidate.matchScore > 0 ? (
            <div className="rounded-2xl border border-border bg-muted/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Bot size={11} /> {t('cdw_ai_match_analysis')}
                </p>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-bold',
                  candidate.matchScore >= 80
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : candidate.matchScore >= 60
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                )}>
                  <Star size={10} className="inline mr-0.5" />
                  {candidate.matchScore}{t('cdw_match_suffix')}
                </span>
              </div>
              {candidate.aiSummary && (
                <div className="px-4 py-3 space-y-2">
                  <p className="text-sm text-foreground leading-relaxed">{candidate.aiSummary}</p>
                  {candidate.aiReasoning && (
                    <div>
                      <button
                        onClick={() => setShowReasoning((v) => !v)}
                        className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        {showReasoning ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {showReasoning ? t('cdw_hide_reasoning') : t('cdw_show_reasoning')}
                      </button>
                      {showReasoning && (
                        <p className="mt-2 rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                          {candidate.aiReasoning}
                        </p>
                      )}
                    </div>
                  )}
                  {candidate.aiProcessedAt && (
                    <p className="text-[10px] text-muted-foreground/60">
                      {t('cdw_analysed_prefix')}{new Date(candidate.aiProcessedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Bot size={14} className="text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground">{t('cdw_ai_pending')}</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/analyze-cv', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ applicationId: candidate.id }),
                    });
                    globalMutate('/api/candidates');
                  } catch (err) { console.error(err); }
                }}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300"
              >
                <Bot size={11} /> {t('cdw_run_ai')}
              </button>
            </div>
          )}

          {/* CV / Resume section */}
          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <FileText size={11} /> {t('cdw_cv_resume')}
              </p>
              <button
                onClick={() => { setCvUrlEdit(!cvUrlEdit); setCvUrlValue(candidate.cvUrl ?? ''); }}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-brand-600 transition-colors"
              >
                <Pencil size={10} /> {cvUrlEdit ? t('cdw_cancel') : t('cdw_edit_url')}
              </button>
            </div>

            {cvUrlEdit ? (
              <div className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t('cdw_paste_drive_url')}
                </p>
                <div className="flex gap-2">
                  <input
                    value={cvUrlValue}
                    onChange={(e) => setCvUrlValue(e.target.value)}
                    placeholder="https://drive.google.com/file/d/…"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600"
                  />
                  <button
                    onClick={handleSaveCvUrl}
                    disabled={savingCvUrl}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {savingCvUrl ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    {t('cdw_save')}
                  </button>
                </div>
              </div>
            ) : effectiveCvUrl ? (
              <div>
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-brand-700 dark:text-brand-300">{t('cdw_cv_resume')}</p>
                    <p className="truncate text-xs text-brand-600/70 dark:text-brand-400/70">{effectiveCvUrl}</p>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-border px-4 py-2.5">
                  <a
                    href={effectiveCvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                  >
                    <ExternalLink size={12} /> {t('cdw_view')}
                  </a>
                  <a
                    href={proxyDownloadUrl(effectiveCvUrl)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/30"
                  >
                    <Download size={12} /> {t('cdw_download')}
                  </a>
                </div>
              </div>
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-muted-foreground">
                  {t('cdw_no_cv_url')} <strong>{t('cdw_edit_url')}</strong> {t('cdw_no_cv_url_suffix')}
                </p>
                {candidate.notes && candidate.notes.includes('CV:') && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    {t('cdw_cv_uploaded_prefix')}{candidate.notes.match(/CV: ([^|]+)/)?.[1]?.trim()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {candidate.notes && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('cdw_recruiter_notes')}</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{candidate.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
