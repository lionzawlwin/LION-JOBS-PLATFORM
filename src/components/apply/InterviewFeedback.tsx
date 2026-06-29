'use client';

import { useState } from 'react';
import { Star, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  candidateId: string;
  company?: string;
  jobTitle?: string;
}

export function InterviewFeedback({ candidateId, company = '', jobTitle = '' }: Props) {
  const [rating, setRating]             = useState(0);
  const [hoverRating, setHoverRating]   = useState(0);
  const [experience, setExperience]     = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (experience.trim().length < 10) { setError('Please write at least 10 characters about your experience.'); return; }
    if (wouldRecommend === null) { setError('Please indicate whether you would recommend this company.'); return; }

    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, company, jobTitle, rating, experience, wouldRecommend }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 size={48} className="text-emerald-500" />
        <h2 className="text-2xl font-bold text-foreground">Thank You!</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your feedback helps other candidates and improves hiring practices at {company || 'this company'}.
        </p>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {/* Overall rating */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          Overall Interview Experience <span className="text-danger">*</span>
        </label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={32}
                className={cn(
                  'transition-colors',
                  star <= displayRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-none text-muted-foreground/30',
                )}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
            </span>
          )}
        </div>
      </div>

      {/* Written experience */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          Describe Your Experience <span className="text-danger">*</span>
        </label>
        <p className="text-xs text-muted-foreground">
          How was the interview process? Was the interviewer professional and prepared?
        </p>
        <textarea
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          rows={4}
          placeholder="The interview was..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
        />
        <p className="text-right text-xs text-muted-foreground">{experience.length} / 500</p>
      </div>

      {/* Would recommend */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-foreground">
          Would you recommend this company to others? <span className="text-danger">*</span>
        </label>
        <div className="flex gap-3">
          {([true, false] as const).map((val) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => setWouldRecommend(val)}
              className={cn(
                'flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                wouldRecommend === val
                  ? val
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'border-border text-muted-foreground hover:border-foreground/30',
              )}
            >
              {val ? '👍 Yes, I would' : '👎 Not really'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 size={15} className="animate-spin" /> Submitting…
          </span>
        ) : (
          'Submit Feedback'
        )}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Your feedback is anonymous and helps other candidates make informed decisions.
      </p>
    </form>
  );
}
