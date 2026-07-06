import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepDef<T extends string> {
  value: T;
  label: string;
}

interface OffPath {
  label: string;
  tone: 'warning' | 'danger' | 'neutral';
}

interface Props<T extends string> {
  steps: StepDef<T>[];
  /** Current status. If it isn't one of `steps` (e.g. Overdue, Inactive --
   *  a lateness/exception flag rather than a lifecycle stage), pass
   *  `offPath` instead of expecting it to highlight in the sequence. */
  current: T;
  onSelect?: (value: T) => void;
  /** Renders as a separate badge next to the stepper instead of forcing a
   *  non-linear state into the linear sequence. */
  offPath?: OffPath | null;
}

const OFF_PATH_TONE: Record<OffPath['tone'], string> = {
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300',
  danger:  'border-red-200 bg-red-50 text-red-600 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-400',
  neutral: 'border-border bg-muted text-muted-foreground',
};

// A connected-dot stepper for linear status sequences (candidate stage,
// invoice status, company status) -- replaces a plain dropdown/button-row
// with something that visually communicates "step 2 of 4", not just "the
// current label". Steps before `current` are marked done, `current` is
// highlighted, steps after are neutral/future. Clicking a dot (when
// `onSelect` is provided) fires the same status-change handler each
// screen already had -- this changes the visual, not the underlying
// mutation.
export function StatusStepper<T extends string>({ steps, current, onSelect, offPath }: Props<T>) {
  const currentIndex = steps.findIndex((s) => s.value === current);

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center">
        {steps.map((step, idx) => {
          const isDone    = currentIndex >= 0 && idx < currentIndex;
          const isCurrent = idx === currentIndex;
          return (
            <div key={step.value} className="flex flex-1 items-center last:flex-none">
              <button
                type="button"
                onClick={() => onSelect?.(step.value)}
                disabled={!onSelect}
                title={step.label}
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors',
                  isCurrent
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : isDone
                      ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-600/40 dark:bg-brand-600/10 dark:text-brand-400'
                      : 'border-border bg-background text-muted-foreground',
                  onSelect && !isCurrent && 'cursor-pointer hover:border-brand-400',
                  !onSelect && 'cursor-default',
                )}
              >
                {isDone ? <Check size={11} /> : idx + 1}
              </button>
              {idx < steps.length - 1 && (
                <div className={cn('h-0.5 flex-1 min-w-3', isDone ? 'bg-brand-300 dark:bg-brand-600/30' : 'bg-border')} />
              )}
            </div>
          );
        })}
      </div>

      <span className="text-xs font-semibold text-foreground">
        {currentIndex >= 0 ? steps[currentIndex].label : null}
      </span>

      {offPath && (
        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', OFF_PATH_TONE[offPath.tone])}>
          {offPath.label}
        </span>
      )}
    </div>
  );
}
