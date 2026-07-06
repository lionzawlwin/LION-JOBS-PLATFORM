import { describe, it, expect } from 'vitest';
import { jobBoostInvoicePosition, parseJobBoost } from './jobRules';

describe('job boost invoice tagging', () => {
  it('round-trips: a generated position yields back the exact jobId and duration it was tagged with', () => {
    const position = jobBoostInvoicePosition('jb-12345', 'Senior Software Engineer', 14);
    expect(parseJobBoost(position)).toEqual({ jobId: 'jb-12345', durationDays: 14 });
  });

  it('handles a job title containing brackets or parentheses without corrupting the parse', () => {
    const position = jobBoostInvoicePosition('jb-99', 'Engineer (Backend) [Urgent]', 30);
    expect(parseJobBoost(position)).toEqual({ jobId: 'jb-99', durationDays: 30 });
  });

  it('does not misclassify a candidate-placement, plan-upgrade, or company-featured invoice position', () => {
    expect(parseJobBoost('Senior Software Engineer')).toBeNull();
    expect(parseJobBoost('Plan Upgrade — Gold')).toBeNull();
    expect(parseJobBoost('Featured Placement — 30 days')).toBeNull();
  });
});
