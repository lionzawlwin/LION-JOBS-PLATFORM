/**
 * Job description generator — Claude AI only, no rule-based fallback.
 *
 * Unlike cvAnalyzer.ts (which has a free deterministic scorer as its
 * baseline), there is no meaningful non-AI way to draft prose from a job
 * title alone. Returns null when ANTHROPIC_API_KEY is unset — same "unset
 * = no-op" contract as every other optional integration in this repo — the
 * caller (the API route) turns that into a 503, not an error.
 */

export interface JobDraftInput {
  title:        string;
  category:     string;
  type:         string;
  location:     string;
  companyName:  string;
  keyPoints?:   string; // free-text hints from the poster, optional
}

export interface JobDraftResult {
  description:  string;
  requirements: string[];
  benefits:     string[];
}

function isJobDraftResult(value: unknown): value is JobDraftResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.description === 'string' &&
    Array.isArray(v.requirements) && v.requirements.every((r) => typeof r === 'string') &&
    Array.isArray(v.benefits)     && v.benefits.every((b) => typeof b === 'string')
  );
}

export async function generateJobDraft(input: JobDraftInput): Promise<JobDraftResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const prompt = `You are a senior recruiter writing a job listing for a Myanmar recruitment agency's job board.

## ROLE
Title: ${input.title}
Category: ${input.category}
Type: ${input.type}
Location: ${input.location}
Company: ${input.companyName}
${input.keyPoints ? `Extra notes from the poster: ${input.keyPoints}` : ''}

Write a professional, appealing job description (3-5 short paragraphs, no markdown headers), plus a requirements list and a benefits list. Keep it realistic for the Myanmar job market — don't invent a salary or company history you don't have.

Return ONLY a JSON object with exactly:
- "description": string (the job description prose)
- "requirements": string[] (5-8 concise bullet points, no leading dashes)
- "benefits": string[] (3-6 concise bullet points, no leading dashes)

Example: {"description":"...","requirements":["...","..."],"benefits":["...","..."]}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') return null;

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed: unknown = JSON.parse(jsonMatch[0]);
  return isJobDraftResult(parsed) ? parsed : null;
}
