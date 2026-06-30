import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-4-5-20251001'; // Fast, cost-effective for structured extraction

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export interface CandidateProfile {
  name:            string;
  position:        string;
  experienceYears?: string;
  education?:      string;
  skills?:         string;
  currentCompany?: string;
  languages?:      string;
  cityLocation?:   string;
  linkedinUrl?:    string;
}

export interface JobProfile {
  title:        string;
  description:  string;
  requirements: string[];
  category?:    string;
  type?:        string;
}

export interface AiScoreResult {
  score:     number;  // 0-100
  summary:   string;  // 2-3 sentence candidate summary
  reasoning: string;  // fit reasoning: strengths and gaps
}

export async function scoreCandidateAgainstJob(
  candidate: CandidateProfile,
  job: JobProfile,
  cvText?: string, // optional raw CV text (extracted from PDF or plain text)
): Promise<AiScoreResult | null> {
  const ai = getClient();
  if (!ai) {
    console.warn('[cvAnalyzer] ANTHROPIC_API_KEY not set — skipping AI scoring.');
    return null;
  }

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
    job.type     ? `Type: ${job.type}` : null,
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

## TASK
Return a JSON object with exactly these three keys:
- "score": integer 0-100 (80-100 = strong match, 50-79 = moderate, 0-49 = weak)
- "summary": 2-3 sentences describing the candidate's profile (name, background, key strengths)
- "reasoning": 2-3 sentences explaining fit — mention specific matching strengths AND any notable gaps

Rules:
- Base score primarily on: experience years vs job requirements, skills match, education relevance
- If the candidate has no experience info, score conservatively (max 55)
- Return ONLY the JSON object, no other text

Example output:
{"score":78,"summary":"Aung Ko Ko is a Sales professional with 4 years in B2B sales and strong English communication skills. He brings solid client relationship experience from his current role at ABC Trading.","reasoning":"Strong match on experience duration and sales skills. Lacks formal digital marketing certification mentioned in requirements, but compensates with hands-on track record."}`;

  try {
    const message = await ai.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    // Strip any markdown code fences the model might add
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonText) as { score: number; summary: string; reasoning: string };

    return {
      score:     Math.min(100, Math.max(0, Math.round(Number(parsed.score)))),
      summary:   String(parsed.summary ?? '').trim(),
      reasoning: String(parsed.reasoning ?? '').trim(),
    };
  } catch (err) {
    console.error('[cvAnalyzer] AI scoring failed:', err);
    return null;
  }
}

/**
 * Attempt to extract plain text from a base64-encoded PDF using
 * the Anthropic Files API (document content type).
 * Returns null if extraction fails or API key is missing.
 */
export async function extractTextFromBase64(
  base64: string,
  mimeType: string,
): Promise<string | null> {
  const ai = getClient();
  if (!ai) return null;

  // Only attempt PDF extraction — text files are already plain text
  if (!mimeType.includes('pdf')) return null;

  try {
    const msg = await ai.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type:       'base64',
                media_type: 'application/pdf',
                data:       base64,
              },
            } as Anthropic.DocumentBlockParam,
            {
              type: 'text',
              text: 'Extract and return ALL text from this CV/resume document. Return only the extracted text, no commentary.',
            },
          ],
        },
      ],
    });

    return msg.content[0].type === 'text' ? msg.content[0].text : null;
  } catch (err) {
    console.error('[cvAnalyzer] PDF text extraction failed:', err);
    return null;
  }
}
