/**
 * Job description generator — Claude AI only, no rule-based fallback.
 *
 * Unlike cvAnalyzer.ts (which has a free deterministic scorer as its
 * baseline), there is no meaningful non-AI way to draft prose from a job
 * title alone. Returns null when ANTHROPIC_API_KEY is unset — same "unset
 * = no-op" contract as every other optional integration in this repo — the
 * caller (the API route) turns that into a 503, not an error.
 *
 * Root-cause note (2026-07-06): the original version asked the model to
 * hand-format its own JSON in free text and extracted it with a
 * first-brace-to-last-brace regex + a bare JSON.parse. A job description
 * is prose -- it can contain quotes, apostrophes, or punctuation the model
 * doesn't always escape correctly inside a hand-written JSON string, and
 * any malformed output threw an uncaught SyntaxError all the way up to the
 * API route (logged as "Job description generation failed"). Switched to
 * Claude's tool-use (function-calling) mode instead: the model is forced
 * to call submit_job_draft with schema-validated arguments, so there is no
 * free-text JSON to parse or get wrong.
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

const SUBMIT_TOOL_NAME = 'submit_job_draft';

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

Call the ${SUBMIT_TOOL_NAME} tool with the finished draft.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    tools: [{
      name: SUBMIT_TOOL_NAME,
      description: 'Submit the drafted job listing content.',
      input_schema: {
        type: 'object',
        properties: {
          description:  { type: 'string', description: 'The job description prose (3-5 short paragraphs)' },
          requirements: { type: 'array', items: { type: 'string' }, description: '5-8 concise bullet points, no leading dashes' },
          benefits:     { type: 'array', items: { type: 'string' }, description: '3-6 concise bullet points, no leading dashes' },
        },
        required: ['description', 'requirements', 'benefits'],
      },
    }],
    tool_choice: { type: 'tool', name: SUBMIT_TOOL_NAME },
    messages: [{ role: 'user', content: prompt }],
  });

  const toolUse = message.content.find((b) => b.type === 'tool_use');
  if (!toolUse || toolUse.type !== 'tool_use') return null;

  return isJobDraftResult(toolUse.input) ? toolUse.input : null;
}
