'use client';

import { useState } from 'react';
import { Star, Check, X, MessageSquareHeart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingTestimonials } from '@/hooks/useTestimonials';

// Layer 18: staff moderation queue for candidate feedback that opted in
// (InterviewFeedback.tsx's consent checkbox) to being featured as a
// public homepage testimonial. Nothing here ever appears on the site
// until a staff member explicitly approves it.
export function TestimonialModeration() {
  const { pending, isLoading, mutate } = usePendingTestimonials();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(id: string, status: 'approved' | 'rejected') {
    setBusyId(id);
    try {
      await fetch('/api/testimonials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      await mutate();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-5 py-3 flex items-center gap-2">
        <MessageSquareHeart size={14} className="text-muted-foreground" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wide">
          Testimonials Awaiting Review
        </span>
        {pending.length > 0 && (
          <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {pending.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="px-5 py-6 text-xs text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="px-5 py-6 text-xs text-muted-foreground">
          No candidate feedback is currently waiting for a featuring decision. Candidates opt in
          from the interview feedback form; approved quotes appear on the homepage automatically.
        </p>
      ) : (
        <div className="divide-y divide-border">
          {pending.map((tm) => (
            <div key={tm.id} className="flex items-start gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-1">
                  {Array.from({ length: tm.rating }).map((_, i) => (
                    <Star key={i} size={11} className="fill-gold-500 text-gold-500" />
                  ))}
                </div>
                <p className="text-xs text-foreground">&ldquo;{tm.quote}&rdquo;</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Interviewed at {tm.company} · {new Date(tm.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  disabled={busyId === tm.id}
                  onClick={() => review(tm.id, 'approved')}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-900/20 dark:text-emerald-400',
                  )}
                >
                  <Check size={12} /> Approve
                </button>
                <button
                  disabled={busyId === tm.id}
                  onClick={() => review(tm.id, 'rejected')}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50',
                  )}
                >
                  <X size={12} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
