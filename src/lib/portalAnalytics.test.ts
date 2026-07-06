import { describe, it, expect } from 'vitest';
import { cumulativeFunnelCounts, computeHiringFunnel } from './portalAnalytics';

describe('cumulativeFunnelCounts', () => {
  it('sums each stage with every stage after it', () => {
    const result = cumulativeFunnelCounts(100, { Applied: 5, Shortlisted: 3, Interview: 2, Hired: 1 });
    expect(result).toEqual({
      views: 100,
      applied:     11, // 5+3+2+1
      shortlisted: 6,  // 3+2+1
      interview:   3,  // 2+1
      hired:       1,
    });
  });

  it('handles an all-zero pipeline', () => {
    const result = cumulativeFunnelCounts(0, { Applied: 0, Shortlisted: 0, Interview: 0, Hired: 0 });
    expect(result).toEqual({ views: 0, applied: 0, shortlisted: 0, interview: 0, hired: 0 });
  });
});

describe('computeHiringFunnel', () => {
  it('computes stage-to-stage conversion rates in order', () => {
    const funnel = computeHiringFunnel({ views: 100, applied: 10, shortlisted: 5, interview: 2, hired: 1 });
    expect(funnel.map((s) => s.key)).toEqual(['views', 'applied', 'shortlisted', 'interview', 'hired']);
    expect(funnel[0].conversionFromPrevious).toBeNull(); // views has no "previous" stage
    expect(funnel[1].conversionFromPrevious).toBeCloseTo(0.10); // 10/100
    expect(funnel[2].conversionFromPrevious).toBeCloseTo(0.50); // 5/10
    expect(funnel[3].conversionFromPrevious).toBeCloseTo(0.40); // 2/5
    expect(funnel[4].conversionFromPrevious).toBeCloseTo(0.50); // 1/2
  });

  it('reports null (not 0) conversion when the previous stage has zero count', () => {
    const funnel = computeHiringFunnel({ views: 0, applied: 0, shortlisted: 0, interview: 0, hired: 0 });
    expect(funnel.every((s) => s.conversionFromPrevious === null || s.key === 'views')).toBe(true);
  });

  it('handles views present but zero applicants without throwing', () => {
    const funnel = computeHiringFunnel({ views: 50, applied: 0, shortlisted: 0, interview: 0, hired: 0 });
    expect(funnel[1]).toEqual({ key: 'applied', count: 0, conversionFromPrevious: 0 });
  });

  it('preserves raw counts unchanged', () => {
    const funnel = computeHiringFunnel({ views: 42, applied: 42, shortlisted: 42, interview: 42, hired: 42 });
    expect(funnel.map((s) => s.count)).toEqual([42, 42, 42, 42, 42]);
    expect(funnel[4].conversionFromPrevious).toBe(1);
  });
});
