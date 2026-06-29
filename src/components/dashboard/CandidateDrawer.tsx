'use client';

import { useEffect, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import {
  X, Phone, Mail, Briefcase, DollarSign,
  Calendar, FileText, Star, ExternalLink, Clock,
  Download, Link2, Loader2, Pencil, Unlink, CheckCircle2,
  Trash2, AlertTriangle, MapPin, GraduationCap, Globe,
  Languages, Zap, Building2,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { Candidate, ApplicationStatus, Job } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function proxyDownloadUrl(rawUrl: string): string {
  return `/api/download?url=${encodeURIComponent(rawUrl)}`;
}

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
  // CV URL editing
  const [cvUrlEdit,    setCvUrlEdit]    = useState(false);
  const [cvUrlValue,   setCvUrlValue]   = useState('');
  const [savingCvUrl,  setSavingCvUrl]  = useState(false);

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

  if (!candidate) return null;

  const initials = candidate.name
    .split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  const effectiveCvUrl = cvUrlEdit ? undefined : (candidate.cvUrl || cvUrlValue || undefined);

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
              <p className="text-sm text-muted-foreground">{candidate.position || 'General Application'}</p>
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
                title="Delete candidate"
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 hover:border-red-400 transition-colors dark:border-red-800/40 dark:hover:bg-red-900/20"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/40 dark:bg-red-900/20 px-2 py-1">
                <AlertTriangle size={12} className="text-red-600 dark:text-red-400 shrink-0" />
                <span className="text-xs text-red-700 dark:text-red-400 font-medium">Delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                >
                  No
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
                {candidate.stage}
              </span>
              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} /> {timeAgo(candidate.appliedAt)}
              </span>
            </div>

            {onStageChange && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Move to Stage</p>
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
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Job Assignment */}
            <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <Link2 size={11} /> Job Requisition Link
              </p>
              {linkedJob && !jobEditMode && (
                <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 dark:border-brand-700/30 dark:bg-brand-600/10 px-4 py-3">
                  <CheckCircle2 size={16} className="shrink-0 text-brand-600 dark:text-brand-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-brand-700 dark:text-brand-300 truncate">{linkedJob.title}</p>
                    {linkedJob.company && <p className="text-[11px] text-brand-600/70 dark:text-brand-400/70">{linkedJob.company}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setJobEditMode(true); setLinkJobId(linkedJob.id); }} title="Change job" className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-brand-600 hover:border-brand-300 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={handleClearJob} disabled={linking} title="Remove link" className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors disabled:opacity-40">
                      {linking ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
                    </button>
                  </div>
                </div>
              )}
              {(!linkedJob || jobEditMode) && jobs.length > 0 && (
                <div className="flex gap-2">
                  <select value={linkJobId} onChange={(e) => setLinkJobId(e.target.value)} className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 transition-colors">
                    <option value="">Select a job…</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title} — {j.company}</option>)}
                  </select>
                  <button onClick={handleLinkJob} disabled={!linkJobId || linking} className="flex items-center gap-1.5 rounded-xl border border-brand-600 bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
                    {linking ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                    {jobEditMode ? 'Update' : 'Assign'}
                  </button>
                  {jobEditMode && (
                    <button onClick={() => { setJobEditMode(false); setLinkJobId(''); }} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors">Cancel</button>
                  )}
                </div>
              )}
              {!linkedJob && !jobEditMode && jobs.length === 0 && (
                <p className="text-xs text-muted-foreground">No jobs posted yet.</p>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border">
            <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Contact Details</p>
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
              <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Professional Profile</p>
              {candidate.education && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <GraduationCap size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Education</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.education}</p>
                  </div>
                </div>
              )}
              {candidate.experienceYears && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Briefcase size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Experience</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.experienceYears} years</p>
                  </div>
                </div>
              )}
              {candidate.currentCompany && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Building2 size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Current Employer</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.currentCompany}</p>
                  </div>
                </div>
              )}
              {candidate.currentSalary && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <DollarSign size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Current Salary</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.currentSalary}</p>
                  </div>
                </div>
              )}
              {candidate.languages && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Languages size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Languages</p>
                    <p className="text-sm font-semibold text-foreground">{candidate.languages}</p>
                  </div>
                </div>
              )}
              {candidate.skills && (
                <div className="flex items-start gap-3 px-4 py-3">
                  <Zap size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Key Skills</p>
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
            <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role Details</p>
            {candidate.position && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Briefcase size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">Applied Position</p><p className="text-sm font-semibold text-foreground">{candidate.position}</p></div>
              </div>
            )}
            {candidate.salaryExpected && (
              <div className="flex items-center gap-3 px-4 py-3">
                <DollarSign size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">Expected Salary</p><p className="text-sm font-semibold text-foreground">{candidate.salaryExpected}</p></div>
              </div>
            )}
            {candidate.notes && candidate.notes.includes('notice_period:') === false && candidate.company && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">Company</p><p className="text-sm font-semibold text-foreground">{candidate.company}</p></div>
              </div>
            )}
            {candidate.interviewDate && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">Interview Date</p><p className="text-sm font-semibold text-foreground">{candidate.interviewDate}</p></div>
              </div>
            )}
            {candidate.source && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Star size={14} className="text-muted-foreground shrink-0" />
                <div><p className="text-[10px] text-muted-foreground">Source</p><p className="text-sm font-semibold text-foreground">{candidate.source}</p></div>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Applied</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {new Date(candidate.appliedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {candidate.matchScore > 0 && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rating</p>
                <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1">
                  {'★'.repeat(candidate.matchScore)}{'☆'.repeat(5 - candidate.matchScore)}
                  <span className="text-muted-foreground text-xs ml-1">{candidate.matchScore}/5</span>
                </p>
              </div>
            )}
          </div>

          {/* CV / Resume section */}
          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <FileText size={11} /> CV / Resume
              </p>
              <button
                onClick={() => { setCvUrlEdit(!cvUrlEdit); setCvUrlValue(candidate.cvUrl ?? ''); }}
                className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-brand-600 transition-colors"
              >
                <Pencil size={10} /> {cvUrlEdit ? 'Cancel' : 'Edit URL'}
              </button>
            </div>

            {cvUrlEdit ? (
              <div className="p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Paste the Google Drive shareable URL for this candidate&apos;s CV.
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
                    Save
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
                    <p className="text-sm font-bold text-brand-700 dark:text-brand-300">CV / Resume</p>
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
                    <ExternalLink size={12} /> View
                  </a>
                  <a
                    href={proxyDownloadUrl(effectiveCvUrl)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm shadow-brand-600/30"
                  >
                    <Download size={12} /> Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="text-xs text-muted-foreground">
                  No CV URL yet. After Make.com uploads the file to Google Drive, click <strong>Edit URL</strong> to paste the Drive link here.
                </p>
                {candidate.notes && candidate.notes.includes('CV:') && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                    CV was uploaded: {candidate.notes.match(/CV: ([^|]+)/)?.[1]?.trim()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {candidate.notes && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recruiter Notes</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{candidate.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
