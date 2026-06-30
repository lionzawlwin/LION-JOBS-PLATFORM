/**
 * CV Analyzer — rule-based scoring (no API key required, completely free).
 *
 * If ANTHROPIC_API_KEY is set in the environment, it upgrades to Claude AI
 * scoring automatically. Without it, the deterministic algorithm below runs.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface CandidateProfile {
  name:             string;
  position:         string;
  experienceYears?: string;
  education?:       string;
  skills?:          string;
  currentCompany?:  string;
  languages?:       string;
  cityLocation?:    string;
  linkedinUrl?:     string;
}

export interface JobProfile {
  title:        string;
  description:  string;
  requirements: string[];
  category?:    string;
  type?:        string;
}

export interface AiScoreResult {
  score:     number;  // 0–100
  summary:   string;
  reasoning: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function keywordsFrom(texts: string[]): Set<string> {
  return new Set(texts.flatMap(tokenise));
}

/** How many candidate keywords appear in the job keyword set. */
function keywordOverlap(candidate: Set<string>, job: Set<string>): number {
  if (job.size === 0) return 0;
  let hits = 0;
  for (const kw of candidate) if (job.has(kw)) hits++;
  return Math.min(1, hits / Math.max(1, Math.min(job.size, 15)));
}

const EDUCATION_RANK: Record<string, number> = {
  phd: 5, doctorate: 5, masters: 4, mba: 4, degree: 3, bachelor: 3,
  diploma: 2, certificate: 1, high: 0,
};
function educationScore(education?: string): number {
  if (!education) return 0;
  const lower = education.toLowerCase();
  for (const [key, val] of Object.entries(EDUCATION_RANK)) {
    if (lower.includes(key)) return val;
  }
  return 1; // has some education
}

function parseYears(raw?: string): number {
  if (!raw) return 0;
  const match = raw.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Infer required years from job requirements text. */
function inferRequiredYears(requirements: string[]): number {
  const combined = requirements.join(' ').toLowerCase();
  const match = combined.match(/(\d+)\+?\s*years?/);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Free rule-based scorer ────────────────────────────────────────────────────

function ruleBasedScore(
  candidate: CandidateProfile,
  job: JobProfile,
): AiScoreResult {
  // 1. Skills keyword match (40 pts)
  const candidateSkillText = [
    candidate.skills ?? '',
    candidate.position,
    candidate.education ?? '',
  ].join(' ');
  const jobText = [job.title, ...job.requirements, job.description.slice(0, 800)].join(' ');

  const candidateKw = keywordsFrom([candidateSkillText]);
  const jobKw       = keywordsFrom([jobText]);
  const skillPct    = keywordOverlap(candidateKw, jobKw);
  const skillScore  = Math.round(skillPct * 40);

  // 2. Experience years (30 pts)
  const candidateYears = parseYears(candidate.experienceYears);
  const requiredYears  = inferRequiredYears(job.requirements);
  let expScore = 0;
  if (candidateYears > 0) {
    if (requiredYears === 0) {
      // No specific years required — give proportional credit
      expScore = Math.min(30, candidateYears * 5);
    } else {
      const ratio = candidateYears / requiredYears;
      expScore = ratio >= 1 ? 30 : Math.round(ratio * 30);
    }
  }

  // 3. Education (15 pts)
  const eduRank  = educationScore(candidate.education);
  const eduScore = Math.min(15, eduRank * 3);

  // 4. Profile completeness bonus (15 pts)
  let completeness = 0;
  if (candidate.skills)          completeness += 5;
  if (candidate.experienceYears) completeness += 4;
  if (candidate.education)       completeness += 3;
  if (candidate.currentCompany)  completeness += 2;
  if (candidate.languages)       completeness += 1;

  const total = Math.min(100, skillScore + expScore + eduScore + completeness);

  // ── Generate human-readable summary ──────────────────────────────────────

  const expText = candidateYears > 0
    ? `${candidateYears} year${candidateYears !== 1 ? 's' : ''} of experience`
    : 'experience level not specified';

  const topSkills = (candidate.skills ?? '')
    .split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const skillText = topSkills.length > 0
    ? `Key skills include ${topSkills.join(', ')}.`
    : 'No skills listed.';

  const companyText = candidate.currentCompany
    ? ` Currently at ${candidate.currentCompany}.`
    : '';

  const summary = `${candidate.name} has ${expText} and is applying for ${job.title || candidate.position}.${companyText} ${skillText}`;

  // ── Reasoning breakdown ───────────────────────────────────────────────────

  const strengths: string[] = [];
  const gaps: string[] = [];

  if (skillScore >= 20) strengths.push(`strong keyword overlap with job requirements (${skillScore}/40 pts)`);
  else if (skillScore > 0) gaps.push(`limited skills match against job requirements (${skillScore}/40 pts)`);
  else gaps.push('no detectable skills match with job requirements');

  if (expScore >= 20) strengths.push(`solid experience of ${candidateYears} yr${candidateYears !== 1 ? 's' : ''}`);
  else if (expScore > 0) gaps.push(`experience (${candidateYears} yr) below the ~${requiredYears} yr target`);
  else gaps.push('years of experience not provided');

  if (eduScore >= 9) strengths.push('relevant education background');
  else if (!candidate.education) gaps.push('education details not provided');

  const reasoning = [
    strengths.length > 0 ? `Strengths: ${strengths.join('; ')}.` : '',
    gaps.length > 0 ? `Gaps: ${gaps.join('; ')}.` : '',
    `Overall match score: ${total}/100.`,
  ].filter(Boolean).join(' ');

  return { score: total, summary: summary.trim(), reasoning: reasoning.trim() };
}

// ── Claude AI scorer (only used if ANTHROPIC_API_KEY is present) ──────────────

async function aiScore(
  candidate: CandidateProfile,
  job: JobProfile,
  cvText?: string,
): Promise<AiScoreResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey });

    const candidateContext = [
      `Name: ${candidate.name}`,
      `Applying for: ${candidate.position}`,
      candidate.experienceYears ? `Experience: ${candidate.experienceYears} years` : null,
      candidate.education        ? `Education: ${candidate.education}` : null,
      candidate.skills           ? `Skills: ${candidate.skills}` : null,
      candidate.currentCompany   ? `Current company: ${candidate.currentCompany}` : null,
      candidate.languages        ? `Languages: ${candidate.languages}` : null,
      candidate.cityLocation     ? `Location: ${candidate.cityLocation}` : null,
      cvText                     ? `\nFull CV text:\n${cvText.slice(0, 6000)}` : null,
    ].filter(Boolean).join('\n');

    const jobContext = [
      `Title: ${job.title}`,
      job.category ? `Category: ${job.category}` : null,
      `Description: ${job.description.slice(0, 1500)}`,
      job.requirements.length > 0
        ? `Requirements:\n${job.requirements.map((r) => `- ${r}`).join('\n')}`
        : null,
    ].filter(Boolean).join('\n');

    const prompt = `You are a senior recruitment analyst. Score how well a candidate matches a job.

## JOB
${jobContext}

## CANDIDATE
${candidateContext}

Return ONLY a JSON object with exactly:
- "score": integer 0-100
- "summary": 2-3 sentences on the candidate's background
- "reasoning": 2-3 sentences on fit strengths and gaps

Example: {"score":78,"summary":"...","reasoning":"..."}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonText) as { score: number; summary: string; reasoning: string };

    return {
      score:     Math.min(100, Math.max(0, Math.round(Number(parsed.score)))),
      summary:   String(parsed.summary ?? '').trim(),
      reasoning: String(parsed.reasoning ?? '').trim(),
    };
  } catch (err) {
    console.warn('[cvAnalyzer] Claude AI scoring failed, falling back to rule-based:', err);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Score a candidate against a job.
 * Uses Claude AI if ANTHROPIC_API_KEY is set, otherwise free rule-based scoring.
 */
export async function scoreCandidateAgainstJob(
  candidate: CandidateProfile,
  job: JobProfile,
  cvText?: string,
): Promise<AiScoreResult | null> {
  // Try Claude AI first; fall back to free rule-based scorer
  if (process.env.ANTHROPIC_API_KEY) {
    const aiResult = await aiScore(candidate, job, cvText);
    if (aiResult) return aiResult;
  }
  return ruleBasedScore(candidate, job);
}

/**
 * Extract plain text from a base64 PDF via Anthropic document API.
 * Returns null if no API key or extraction fails.
 */
export async function extractTextFromBase64(
  base64: string,
  mimeType: string,
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!mimeType.includes('pdf')) return null;

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            } as any,
            { type: 'text', text: 'Extract and return ALL text from this CV/resume. Return only the text.' },
          ],
        },
      ],
    });

    return msg.content[0].type === 'text' ? msg.content[0].text : null;
  } catch {
    return null;
  }
}
