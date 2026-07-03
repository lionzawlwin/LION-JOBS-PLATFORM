import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getJobs } from '@/lib/db';
import { buildJobSlug, formatSalary } from '@/lib/utils';
import { secureCompare } from '@/lib/apiSecurity';
import { logFailure } from '@/lib/observability';
import type { Job } from '@/types';

// ── Zod schema for Mode B (raw field input) ───────────────────────
const rawJobSchema = z.object({
  id:           z.string().min(1).max(64),
  title:        z.string().min(1).max(200),
  company:      z.string().max(200).optional(),
  location:     z.string().max(200).optional(),
  category:     z.string().max(100).optional(),
  type:         z.string().max(50).optional(),
  salaryMin:    z.union([z.number(), z.string()]).optional(),
  salaryMax:    z.union([z.number(), z.string()]).optional(),
  currency:     z.string().max(10).optional(),
  description:  z.string().max(5000).optional(),
  requirements: z.unknown().optional(),
  postedAt:     z.string().optional(),
  isUrgent:     z.unknown().optional(),
  isFeatured:   z.unknown().optional(),
  benefits:     z.unknown().optional(),
});

// NEXT_PUBLIC_ vars are inlined as "" by Turbopack when unset — use runtime var.
const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';
const WEBHOOK_SECRET = process.env.PUBLISH_WEBHOOK_SECRET;

// ── GitHub Actions trigger ────────────────────────────────────────
async function triggerGitHubActions(payload: object): Promise<void> {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  const repo  = process.env.GITHUB_REPO;

  if (!token || !repo) {
    console.warn('[publish-job] GITHUB_ACTIONS_TOKEN or GITHUB_REPO not set — GH Actions skipped');
    return;
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
    method: 'POST',
    headers: {
      Accept:         'application/vnd.github.v3+json',
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent':   'lion-jobs-vercel-webhook/1.0',
    },
    body: JSON.stringify({
      event_type:     'new-job-posted',
      client_payload: payload,
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (res.ok) {
    console.log('[publish-job] GitHub Actions dispatch sent successfully');
  } else {
    const body = await res.text().catch(() => '');
    await logFailure({
      category: 'webhook',
      route:    '/api/webhooks/publish-job',
      message:  `GitHub Actions dispatch failed: ${res.status}`,
      context:  { status: res.status, bodySnippet: body.slice(0, 200) },
    });
  }
}

// ── Auth helper ───────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) return false;
  const bearer = req.headers.get('authorization') ?? '';
  const secret = req.headers.get('x-webhook-secret') ?? '';
  return (
    secureCompare(bearer, `Bearer ${WEBHOOK_SECRET}`) ||
    secureCompare(secret, WEBHOOK_SECRET)
  );
}

// ── Payload builder ───────────────────────────────────────────────
function buildPayload(job: Job) {
  const slug = buildJobSlug(job);
  const salary =
    job.salaryMin > 0
      ? formatSalary(job.salaryMin, job.salaryMax, job.currency)
      : 'Negotiable';

  const excerpt =
    job.description.length > 220
      ? job.description.slice(0, 220).trimEnd() + '…'
      : job.description;

  return {
    title:      job.title,
    company:    job.company,
    location:   job.location,
    type:       job.type,
    category:   job.category,
    salary,
    description: excerpt,
    isUrgent:   job.isUrgent ?? false,
    isFeatured: job.isFeatured ?? false,
    postedAt:   job.postedAt,

    url:          `${SITE_URL}/jobs/${slug}`,
    applyUrl:     `${SITE_URL}/apply/${job.id}`,
    applyWhatsApp: `https://wa.me/959428954289?text=${encodeURIComponent(
      `ကျွန်တော်/ကျွန်မ "${job.title}" ရာထူးအတွက် လျှောက်ထားလိုပါသည်`,
    )}`,

    benefits:     job.benefits ?? [],
    benefitsText: (job.benefits ?? []).join(', ') || '',

    messageShort: buildMessage(job, salary, slug),
    text:         buildMessage(job, salary, slug),
  };
}

function buildMessage(job: Job, salary: string, slug: string): string {
  const lines = [
    job.isUrgent ? '🔥 URGENT HIRING' : '✨ NEW JOB ALERT',
    `💼 ${job.title || '(untitled)'}`,
    `🏢 ${job.company || 'Lion Jobs Agency'}`,
    `📍 ${job.location || 'Myanmar'}  |  ${job.type || 'Full-time'}`,
    `💰 ${salary}`,
    '',
    `👉 Apply Now: ${SITE_URL}/jobs/${slug}`,
  ];
  return lines.join('\n');
}

// ── Route handler ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let payload: ReturnType<typeof buildPayload>;

  if (typeof body.jobId === 'string') {
    // ── Mode A: look up a job from the database by its ID ─────────
    const jobs = await getJobs();
    const job = jobs.find((j) => j.id === body.jobId);
    if (!job) {
      return NextResponse.json({ error: `Job "${body.jobId}" not found` }, { status: 404 });
    }
    payload = buildPayload(job);
  } else if (typeof body.id === 'string' && typeof body.title === 'string') {
    // ── Mode B: raw fields passed directly ─────────────────────────
    const parsed = rawJobSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid raw job fields.';
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    const d = parsed.data;
    const syntheticJob: Job = {
      id:           d.id,
      title:        d.title,
      company:      d.company      ?? 'Lion Jobs Agency',
      location:     d.location     ?? 'Yangon, Myanmar',
      category:     (d.category    ?? 'Other') as Job['category'],
      type:         (d.type        ?? 'Full-time') as Job['type'],
      salaryMin:    Number(d.salaryMin)  || 0,
      salaryMax:    Number(d.salaryMax)  || 0,
      currency:     d.currency     ?? 'MMK',
      description:  d.description  ?? '',
      requirements: Array.isArray(d.requirements) ? d.requirements as string[] : [],
      postedAt:     d.postedAt     ?? new Date().toISOString(),
      isUrgent:     Boolean(d.isUrgent),
      isFeatured:   Boolean(d.isFeatured),
      benefits:     Array.isArray(d.benefits) ? d.benefits as string[] : [],
    };
    payload = buildPayload(syntheticJob);
  } else {
    return NextResponse.json(
      { error: 'Provide { jobId } to look up from the database, or { id, title, ... } for raw fields.' },
      { status: 400 },
    );
  }

  // ── Trigger GitHub Actions (non-blocking) ────────────────────────
  triggerGitHubActions(payload).catch((err) =>
    logFailure({
      category: 'webhook',
      route:    '/api/webhooks/publish-job',
      message:  'GitHub Actions trigger error',
      error:    err,
    }),
  );

  return NextResponse.json({ ok: true, payload });
}
