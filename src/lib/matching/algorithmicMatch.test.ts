import { describe, it, expect } from 'vitest';
import { computeAlgorithmicMatch } from './algorithmicMatch';

const baseJob = {
  title: 'Senior React Developer',
  description: 'We need a React developer with 3+ years of experience building web apps.',
  requirements: ['React', 'TypeScript', 'Node.js', '3+ years experience'],
  location: 'Yangon',
  type: 'Full-time',
};

describe('computeAlgorithmicMatch', () => {
  it('scores a strong match highly across all four factors', () => {
    const result = computeAlgorithmicMatch(
      {
        skills: 'React, TypeScript, Node.js, JavaScript',
        experienceYears: '5',
        cityLocation: 'Yangon',
        education: 'Bachelor of Computer Science',
      },
      baseJob,
    );
    // Hand-traced: skillOverlap 20 + keywordMatch ~4 (keywordMatch is a
    // noisier free-text signal, not expected to be high on its own) +
    // locationMatch 20 + experienceMatch 20 = 64.
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.breakdown.skillOverlap).toBeGreaterThan(0);
    expect(result.breakdown.locationMatch).toBe(20);
    expect(result.breakdown.experienceMatch).toBe(20);
  });

  it('scores near zero when nothing overlaps', () => {
    const result = computeAlgorithmicMatch(
      {
        skills: 'Welding, Forklift Operation',
        experienceYears: '0',
        cityLocation: 'Mandalay',
        education: undefined,
      },
      baseJob,
    );
    expect(result.score).toBeLessThan(30);
    expect(result.breakdown.locationMatch).toBe(0);
  });

  it('gives full location credit for a remote role regardless of candidate location', () => {
    const result = computeAlgorithmicMatch(
      { skills: 'React', cityLocation: 'Mandalay' },
      { ...baseJob, location: 'Anywhere', type: 'Remote' },
    );
    expect(result.breakdown.locationMatch).toBe(20);
  });

  it('gives partial location credit when location data is missing on one side', () => {
    const result = computeAlgorithmicMatch(
      { skills: 'React', cityLocation: undefined },
      baseJob,
    );
    expect(result.breakdown.locationMatch).toBe(10);
  });

  it('gives partial experience credit proportional to the ratio when below the requirement', () => {
    const result = computeAlgorithmicMatch(
      { skills: 'React', experienceYears: '1', cityLocation: 'Yangon' },
      baseJob, // requires 3 years
    );
    // 1/3 of 20 = ~7
    expect(result.breakdown.experienceMatch).toBeGreaterThan(0);
    expect(result.breakdown.experienceMatch).toBeLessThan(20);
  });

  it('never returns a score outside 0-100', () => {
    const result = computeAlgorithmicMatch(
      { skills: 'React React React TypeScript TypeScript Node.js Node.js', experienceYears: '50', cityLocation: 'Yangon' },
      baseJob,
    );
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
