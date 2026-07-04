/**
 * 100% free, in-house candidate <-> job matching. Pure keyword/skill/
 * location/experience comparison against data already in our own
 * database -- no external API calls of any kind, ever.
 *
 * Deliberately a separate module from src/lib/ai/cvAnalyzer.ts's
 * apply-time scorer (which can optionally call Claude if
 * ANTHROPIC_API_KEY is set). This file never imports the Anthropic SDK
 * and is used for the pool-wide "Suggested Candidates" surface, not the
 * existing single-application scoring flow.
 */

export interface MatchCandidateInput {
  skills?:          string | null;
  experienceYears?: string | null;
  cityLocation?:    string | null;
  education?:       string | null;
  currentCompany?:  string | null;
}

export interface MatchJobInput {
  title:        string;
  description:  string;
  requirements: string[];
  location:     string;
  type?:        string;
}

export interface MatchBreakdown {
  skillOverlap:    number; // 0-35
  keywordMatch:    number; // 0-25
  locationMatch:   number; // 0-20
  experienceMatch: number; // 0-20
}

export interface MatchResult {
  score:     number; // 0-100
  breakdown: MatchBreakdown;
  reasons:   string[];
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function tokenSet(texts: (string | null | undefined)[]): Set<string> {
  return new Set(texts.filter((t): t is string => Boolean(t)).flatMap(tokenise));
}

function overlapPct(candidate: Set<string>, reference: Set<string>, cap = 15): number {
  if (reference.size === 0) return 0;
  let hits = 0;
  for (const kw of candidate) if (reference.has(kw)) hits++;
  return Math.min(1, hits / Math.max(1, Math.min(reference.size, cap)));
}

function parseYears(raw?: string | null): number {
  if (!raw) return 0;
  const match = raw.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function inferRequiredYears(requirements: string[], description: string): number {
  const combined = [...requirements, description].join(' ').toLowerCase();
  const match = combined.match(/(\d+)\+?\s*years?/);
  return match ? parseInt(match[1], 10) : 0;
}

function normalize(text?: string | null): string {
  return (text ?? '').toLowerCase().trim();
}

export function computeAlgorithmicMatch(
  candidate: MatchCandidateInput,
  job: MatchJobInput,
): MatchResult {
  const reasons: string[] = [];

  // 1. Skill overlap (35 pts) — candidate.skills vs job.requirements, the
  // most structured field either side has, so weighted highest.
  const candidateSkills = tokenSet([candidate.skills]);
  const jobRequirements = tokenSet(job.requirements);
  const skillPct = overlapPct(candidateSkills, jobRequirements);
  const skillOverlap = Math.round(skillPct * 35);
  if (skillOverlap >= 20) reasons.push(`Strong skill overlap with job requirements (${Math.round(skillPct * 100)}%).`);
  else if (skillOverlap > 0) reasons.push(`Some skill overlap with job requirements (${Math.round(skillPct * 100)}%).`);
  else reasons.push('No detectable skill overlap with job requirements.');

  // 2. Broader keyword match (25 pts) — candidate's free-text profile vs
  // job title + description, catches signal outside the structured
  // skills/requirements fields.
  const candidateText = tokenSet([candidate.skills, candidate.education, candidate.currentCompany]);
  const jobText = tokenSet([job.title, job.description.slice(0, 1000)]);
  const keywordPct = overlapPct(candidateText, jobText, 25);
  const keywordMatch = Math.round(keywordPct * 25);
  if (keywordMatch >= 15) reasons.push('Profile keywords closely match the job description.');
  else if (keywordMatch > 0) reasons.push('Some profile keywords match the job description.');

  // 3. Location match (20 pts) — normalized exact/substring match; a
  // remote role matches any location; missing data on either side gets
  // partial credit rather than zero (matches this codebase's existing
  // completeness-over-penalty philosophy in ruleBasedScore()).
  const candLoc = normalize(candidate.cityLocation);
  const jobLoc  = normalize(job.location);
  const isRemote = normalize(job.type).includes('remote') || jobLoc.includes('remote');
  let locationMatch: number;
  if (isRemote) {
    locationMatch = 20;
    reasons.push('Remote role — location is not a constraint.');
  } else if (!candLoc || !jobLoc) {
    locationMatch = 10;
    reasons.push('Location not fully specified on one side — partial credit given.');
  } else if (candLoc === jobLoc || candLoc.includes(jobLoc) || jobLoc.includes(candLoc)) {
    locationMatch = 20;
    reasons.push(`Location match (${candidate.cityLocation}).`);
  } else {
    locationMatch = 0;
    reasons.push(`Location mismatch (candidate: ${candidate.cityLocation || 'unknown'}, job: ${job.location}).`);
  }

  // 4. Experience comparison (20 pts)
  const candidateYears = parseYears(candidate.experienceYears);
  const requiredYears  = inferRequiredYears(job.requirements, job.description);
  let experienceMatch: number;
  if (candidateYears === 0) {
    experienceMatch = requiredYears === 0 ? 10 : 0;
    reasons.push('Years of experience not provided.');
  } else if (requiredYears === 0) {
    experienceMatch = Math.min(20, candidateYears * 3);
    reasons.push(`${candidateYears} yr${candidateYears !== 1 ? 's' : ''} experience (job doesn't specify a minimum).`);
  } else {
    const ratio = candidateYears / requiredYears;
    experienceMatch = ratio >= 1 ? 20 : Math.round(ratio * 20);
    reasons.push(ratio >= 1
      ? `Meets or exceeds the ~${requiredYears} yr experience target (has ${candidateYears}).`
      : `Below the ~${requiredYears} yr experience target (has ${candidateYears}).`);
  }

  const score = Math.min(100, skillOverlap + keywordMatch + locationMatch + experienceMatch);

  return {
    score,
    breakdown: { skillOverlap, keywordMatch, locationMatch, experienceMatch },
    reasons,
  };
}
