import { describe, it, expect, vi, beforeEach } from 'vitest';

// Employer Applicant Visibility's other enforcement layer (see
// companyRules.test.ts's canViewJobApplicants tests for the ownership
// check). This is this repo's first Supabase-mocked DB-accessor test --
// CLAUDE.md notes no DB-accessor tests existed before because they'd need
// a @supabase/supabase-js mock this repo didn't have; this is that mock,
// scoped narrowly to the one query shape getApplicantsForJob() uses
// (.from().select().eq().order()).
const mockOrder = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: mockOrder,
        })),
      })),
    })),
  },
}));

import { getApplicantsForJob } from './candidates';

// Simulates a hypothetical future bug: if the .select() whitelist were
// ever loosened, or PostgREST's embedded-resource shape changed, this is
// what Supabase would hand back. The test proves getApplicantsForJob()'s
// mapping still only ever constructs the 5 whitelisted fields -- it
// builds a new object literal, never spreads `row` -- so even a leakier
// upstream query can't reach the API response through this function.
const ROW_WITH_EXTRA_SENSITIVE_FIELDS = {
  id: 'ap-1',
  stage: 'Hired',
  applied_at: '2026-07-01T00:00:00.000Z',
  google_drive_cv_url: 'https://drive.google.com/file/d/abc123/view',
  candidates: { full_name: 'Jane Doe' },
  // Fields that must never appear in EmployerVisibleApplicant, present
  // here only to prove the mapping discards them even if a future .select()
  // regression started returning them.
  email: 'jane@example.com',
  phone: '09-123-456-789',
  current_salary: '2,000,000 MMK',
  notes: 'Internal recruiter note: asked for 15% above band',
  ai_score: 92,
  ai_summary: 'Strong technical fit',
  linkedin_url: 'https://linkedin.com/in/janedoe',
};

beforeEach(() => {
  mockOrder.mockReset();
});

describe('getApplicantsForJob (Employer Applicant Visibility privacy boundary)', () => {
  it('returns only the whitelisted fields, even when the underlying row carries more', async () => {
    mockOrder.mockResolvedValue({ data: [ROW_WITH_EXTRA_SENSITIVE_FIELDS], error: null });

    const result = await getApplicantsForJob('jb-test');

    expect(result).toHaveLength(1);
    expect(Object.keys(result[0]).sort()).toEqual(['appliedAt', 'cvUrl', 'id', 'name', 'stage'].sort());
    expect(result[0]).toEqual({
      id:        'ap-1',
      name:      'Jane Doe',
      stage:     'Hired',
      appliedAt: '2026-07-01T00:00:00.000Z',
      cvUrl:     'https://drive.google.com/file/d/abc123/view',
    });
  });

  it('never lets a sensitive field leak into the serialized output', async () => {
    mockOrder.mockResolvedValue({ data: [ROW_WITH_EXTRA_SENSITIVE_FIELDS], error: null });

    const result = await getApplicantsForJob('jb-test');
    const serialized = JSON.stringify(result).toLowerCase();

    for (const forbidden of ['email', 'phone', 'salary', 'note', 'ai_score', 'ai_summary', 'linkedin', 'jane@example.com']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('handles a candidate embedded as an array (PostgREST can return either shape)', async () => {
    mockOrder.mockResolvedValue({
      data: [{ ...ROW_WITH_EXTRA_SENSITIVE_FIELDS, candidates: [{ full_name: 'Array Shape Doe' }] }],
      error: null,
    });

    const result = await getApplicantsForJob('jb-test');
    expect(result[0].name).toBe('Array Shape Doe');
  });

  it('returns an empty array on a query error rather than throwing', async () => {
    mockOrder.mockResolvedValue({ data: null, error: { message: 'connection reset' } });

    const result = await getApplicantsForJob('jb-test');
    expect(result).toEqual([]);
  });

  it('returns an empty array when the job has no applicants', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null });

    const result = await getApplicantsForJob('jb-test');
    expect(result).toEqual([]);
  });
});
