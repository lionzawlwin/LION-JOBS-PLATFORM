'use client';

import { useEffect } from 'react';
import {
  X, Phone, Mail, Briefcase, DollarSign, MapPin,
  Calendar, FileText, Star, ExternalLink, Clock,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { Candidate, ApplicationStatus } from '@/types';

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
}

const STAGES: ApplicationStatus[] = ['Applied', 'Shortlisted', 'Interview', 'Hired'];

export function CandidateDrawer({ candidate, onClose, onStageChange }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    if (candidate) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [candidate]);

  if (!candidate) return null;

  const initials = candidate.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
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
              {candidate.company && (
                <p className="text-xs text-muted-foreground">{candidate.company}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

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
          </div>

          {/* Role Details */}
          <div className="rounded-2xl border border-border bg-muted/30 divide-y divide-border">
            <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Role Details</p>
            {candidate.position && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Briefcase size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Applied Position</p>
                  <p className="text-sm font-semibold text-foreground">{candidate.position}</p>
                </div>
              </div>
            )}
            {candidate.salaryExpected && (
              <div className="flex items-center gap-3 px-4 py-3">
                <DollarSign size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Expected Salary</p>
                  <p className="text-sm font-semibold text-foreground">{candidate.salaryExpected}</p>
                </div>
              </div>
            )}
            {candidate.company && (
              <div className="flex items-center gap-3 px-4 py-3">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Company</p>
                  <p className="text-sm font-semibold text-foreground">{candidate.company}</p>
                </div>
              </div>
            )}
            {candidate.interviewDate && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Calendar size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Interview Date</p>
                  <p className="text-sm font-semibold text-foreground">{candidate.interviewDate}</p>
                </div>
              </div>
            )}
            {candidate.source && (
              <div className="flex items-center gap-3 px-4 py-3">
                <Star size={14} className="text-muted-foreground shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Source</p>
                  <p className="text-sm font-semibold text-foreground">{candidate.source}</p>
                </div>
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

          {/* CV Link */}
          {candidate.cvUrl && (
            <a
              href={candidate.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 hover:border-brand-400 hover:bg-brand-100 dark:border-brand-700/30 dark:bg-brand-600/10 dark:hover:bg-brand-600/20 transition-colors group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30 group-hover:shadow-brand-600/50">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-brand-700 dark:text-brand-300">View CV / Resume</p>
                <p className="truncate text-xs text-brand-600/70 dark:text-brand-400/70">{candidate.cvUrl}</p>
              </div>
              <ExternalLink size={15} className="shrink-0 text-brand-500 group-hover:text-brand-700" />
            </a>
          )}

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
