interface Props {
  currentIndex: number; // 0-based
  totalSteps: number;
  stepLabel: string;
}

// Shared by ApplicationForm and HireForm -- a slim filled bar plus
// "Step X of Y: Label" text, on top of whatever step-navigation UI
// (tabs, checkmarks) each form already has.
export function FormStepProgress({ currentIndex, totalSteps, stepLabel }: Props) {
  const pct = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Step {currentIndex + 1} of {totalSteps}: {stepLabel}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
