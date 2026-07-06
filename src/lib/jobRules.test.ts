import { describe, it, expect } from 'vitest';
import { jobBoostInvoicePosition } from './jobRules';

describe('job boost invoice position text', () => {
  it('embeds the job title, jobId, and duration in the human-readable line item', () => {
    expect(jobBoostInvoicePosition('jb-12345', 'Senior Software Engineer', 14))
      .toBe('Job Boost — Senior Software Engineer [jb-12345] (14 days)');
  });

  it('handles a job title containing brackets or parentheses', () => {
    expect(jobBoostInvoicePosition('jb-99', 'Engineer (Backend) [Urgent]', 30))
      .toBe('Job Boost — Engineer (Backend) [Urgent] [jb-99] (30 days)');
  });
});
