'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Briefcase, ChevronDown, ChevronUp, Trash2, MapPin, Clock, AlertTriangle, Star, Loader2 } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { cn, timeAgo } from '@/lib/utils';
import type { Job } from '@/types';

function TypeBadge({ type }: { type: Job['type'] }) {
  const colors: Record<Job['type'], string> = {
    'Full-time': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Part-time': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Contract':  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Remote':    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Hybrid':    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  };
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', colors[type] ?? colors['Full-time'])}>
      {type}
    </span>
  );
}

function JobRow({
  job,
  onDelete,
}: {
  job: Job;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading,    setLoading]    = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setLoading(true);
    await onDelete(job.id);
    setLoading(false);
    setConfirming(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 transition-colors hover:border-border/80">

      {/* Icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-600/10 dark:text-brand-400">
        <Briefcase size={16} />
      </div>

      {/* Main info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{job.title}</p>
          {job.isUrgent   && <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">🔥 Urgent</span>}
          {job.isFeatured && <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">⭐ Featured</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground font-medium">{job.company}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin size={10} /> {job.location}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={10} /> {timeAgo(job.postedAt)}
          </span>
          <TypeBadge type={job.type} />
        </div>
      </div>

      {/* Salary */}
      {job.salaryMax > 0 && (
        <div className="hidden text-right sm:block">
          <p className="text-xs font-semibold text-foreground">
            {job.salaryMin > 0 ? `${job.salaryMin.toLocaleString()} – ` : ''}
            {job.salaryMax.toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">{job.currency}</p>
        </div>
      )}

      {/* Delete control */}
      <div className="flex shrink-0 items-center gap-2">
        {confirming && !loading && (
          <button
            onClick={() => setConfirming(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={loading}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
            confirming
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'border border-border text-muted-foreground hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20',
            loading && 'cursor-not-allowed opacity-60',
          )}
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Trash2 size={12} />
          )}
          {confirming ? 'Sure?' : 'Delete'}
        </button>
      </div>

    </div>
  );
}

export function JobsPanel() {
  const [open, setOpen] = useState(false);
  const { jobs, loading, mutate } = useJobs();

  async function handleDelete(jobId: string) {
    const adminKey = sessionStorage.getItem('lion_admin_key');
    if (!adminKey) {
      toast.error('Admin key not set', {
        description: 'Open the "Post a New Job" panel above, enter your admin key, and try again.',
        duration: 5000,
      });
      return;
    }

    // Optimistic update — remove from list immediately
    const prev = jobs;
    mutate(jobs.filter((j) => j.id !== jobId), false);

    try {
      const res  = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
        method:  'DELETE',
        headers: { 'x-admin-key': adminKey },
      });
      const json = await res.json();

      if (!res.ok) {
        mutate(prev, false);   // rollback
        toast.error('Delete failed', {
          description: json.error ?? 'Could not remove job from Google Sheets.',
          duration: 4000,
        });
        return;
      }

      toast.success('Job deleted', {
        description: 'Row removed from Google Sheets.',
        duration: 3000,
      });
    } catch {
      mutate(prev, false);     // rollback on network error
      toast.error('Network error', {
        description: 'Could not reach the server. Please try again.',
        duration: 4000,
      });
    }
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">

      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/40"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Briefcase size={15} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Manage Jobs</p>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Loading…' : `${jobs.length} live ${jobs.length === 1 ? 'role' : 'roles'} in Google Sheets`}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">

          {/* Warning note */}
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-400">
            <AlertTriangle size={13} className="mt-0.5 shrink-0" />
            Deleting a job permanently removes the row from Google Sheets. This cannot be undone.
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && jobs.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No jobs found in Google Sheets.</p>
          )}

          {!loading && jobs.length > 0 && (
            <div className="space-y-2">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} onDelete={handleDelete} />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
