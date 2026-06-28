import { NextRequest, NextResponse } from 'next/server';
import { getJobs } from '@/lib/sheets';
import { buildJobSlug, formatSalary } from '@/lib/utils';
import type { Job } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lion-jobs-platform.vercel.app';
const WEBHOOK_SECRET = process.env.PUBLISH_WEBHOOK_SECRET;
const MAKE_PUBLISH_URL = process.env.MAKE_PUBLISH_WEBHOOK_URL;

// ── Auth helper ───────────────────────────────────────────────────
function isAuthorized(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) return false;
  // Accept either standard Bearer token OR a lightweight custom header
  const bearer = req.headers.get('authorization');
  const secret = req.headers.get('x-webhook-secret');
  return bearer === `Bearer ${WEBHOOK_SECRET}` || secret === WEBHOOK_SECRET;
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
    // Core job info
    title: job.title,
    company: job.company,
    location: job.location,
    type: job.type,
    category: job.category,
    salary,
    description: excerpt,
    isUrgent: job.isUrgent ?? false,
    isFeatured: job.isFeatured ?? false,
    postedAt: job.postedAt,

    // Links for Make.com to embed in messages
    url: `${SITE_URL}/jobs/${slug}`,
    applyUrl: `${SITE_URL}/apply/${job.id}`,
    applyWhatsApp: `https://wa.me/959428954289?text=${encodeURIComponent(
      `ကျွန်တော်/ကျွန်မ "${job.title}" ရာထူးအတွက် လျှောက်ထားလိုပါသည်`,
    )}`,

    // Pre-formatted message strings for Telegram / Viber / Facebook
    messageShort: [
      job.isUrgent ? '🔥 URGENT' : '✨ NEW JOB',
      `💼 *${job.title}*`,
      `🏢 ${job.company}`,
      `📍 ${job.location}  |  ${job.type}`,
      `💰 ${salary}`,
      '',
      `👉 Apply: ${SITE_URL}/jobs/${slug}`,
    ].join('\n'),
  };
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
    // ── Mode A: look up a job from Google Sheets by its row ID ────
    const jobs = await getJobs();
    const job = jobs.find((j) => j.id === body.jobId);
    if (!job) {
      return NextResponse.json({ error: `Job "${body.jobId}" not found` }, { status: 404 });
    }
    payload = buildPayload(job);
  } else if (typeof body.id === 'string' && typeof body.title === 'string') {
    // ── Mode B: raw fields (Make.com Google Sheets "Watch Rows" ──
    //    passes the sheet row directly to this endpoint)
    const syntheticJob: Job = {
      id: body.id,
      title: body.title,
      company: body.company ?? 'Lion Jobs Agency',
      location: body.location ?? 'Yangon, Myanmar',
      category: body.category ?? 'Other',
      type: body.type ?? 'Full-time',
      salaryMin: Number(body.salaryMin) || 0,
      salaryMax: Number(body.salaryMax) || 0,
      currency: body.currency ?? 'MMK',
      description: body.description ?? '',
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      postedAt: body.postedAt ?? new Date().toISOString(),
      isUrgent: Boolean(body.isUrgent),
      isFeatured: Boolean(body.isFeatured),
    };
    payload = buildPayload(syntheticJob);
  } else {
    return NextResponse.json(
      { error: 'Provide { jobId } to look up from Sheets, or { id, title, ... } for raw fields.' },
      { status: 400 },
    );
  }

  // ── Forward to Make.com distribution scenario ─────────────────
  if (!MAKE_PUBLISH_URL) {
    // Dev / unconfigured: return the payload without forwarding
    return NextResponse.json({ ok: true, dev: true, payload });
  }

  try {
    const makeRes = await fetch(MAKE_PUBLISH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!makeRes.ok) {
      console.error('[publish-job] Make.com returned HTTP', makeRes.status);
      return NextResponse.json({ error: 'Make.com delivery failed', upstreamStatus: makeRes.status }, { status: 502 });
    }
  } catch (err) {
    console.error('[publish-job] Make.com fetch error:', err);
    return NextResponse.json({ error: 'Make.com unreachable' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, payload });
}
