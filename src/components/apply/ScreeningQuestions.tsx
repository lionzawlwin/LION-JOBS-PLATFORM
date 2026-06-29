'use client';

import { cn } from '@/lib/utils';
import type { ScreeningQuestion } from '@/types';

interface Props {
  questions: ScreeningQuestion[];
  answers:   Record<string, string>;
  onChange:  (id: string, value: string) => void;
}

export function ScreeningQuestions({ questions, answers, onChange }: Props) {
  if (questions.length === 0) return null;

  return (
    <div className="space-y-5 rounded-2xl border border-brand-200/60 bg-brand-50/40 p-5 dark:border-brand-700/20 dark:bg-brand-600/5">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
        Screening Questions
      </p>
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            {q.question}
            {q.required && <span className="ml-1 text-red-500">*</span>}
            {q.knockout && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
                Required to qualify
              </span>
            )}
          </label>

          {q.type === 'yes_no' && (
            <div className="flex gap-3">
              {['Yes', 'No'].map((opt) => (
                <label key={opt} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={(e) => onChange(q.id, e.target.value)}
                    required={q.required}
                    className="accent-brand-600"
                  />
                  <span className="text-sm text-foreground">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'text' && (
            <textarea
              value={answers[q.id] ?? ''}
              onChange={(e) => onChange(q.id, e.target.value)}
              required={q.required}
              rows={3}
              className={cn(
                'w-full resize-y rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600',
              )}
              placeholder="Your answer…"
            />
          )}

          {q.type === 'number' && (
            <input
              type="number"
              value={answers[q.id] ?? ''}
              onChange={(e) => onChange(q.id, e.target.value)}
              required={q.required}
              min={0}
              className={cn(
                'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground',
                'focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600',
              )}
              placeholder="e.g. 3"
            />
          )}
        </div>
      ))}
    </div>
  );
}
