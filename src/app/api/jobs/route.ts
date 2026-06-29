import { getJobs, appendJob } from '@/lib/sheets';
import { NextRequest, NextResponse } from 'next/server';

// ── GET /api/jobs ─────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const jobs = await getJobs();
    return Response.json(jobs, {
      headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    console.error('[GET /api/jobs]', err);
    return Response.json(
      { error: 'Failed to load jobs. Check server configuration.' },
      { status: 503 },
    );
  }
}

// ── POST /api/jobs ────────────────────────────────────────────────
// Creates a new job row in Google Sheets and fires the publish webhook.
// Requires header:  x-admin-key: <ADMIN_KEY env var>
export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (!ADMIN_KEY) {
    return NextResponse.json(
      { error: 'ADMIN_KEY is not configured on the server.' },
      { status: 503 },
    );
  }
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse & validate ─────────────────────────────────────────
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, company, location, category, type, description } = body;
  if (!title || !company || !location || !category || !type || !description) {
    return NextResponse.json(
      { error: 'Missing required fields: title, company, location, category, type, description' },
      { status: 422 },
    );
  }

  // ── Append to Google Sheets ───────────────────────────────────
  let jobId: string;
  try {
    jobId = await appendJob({
      title:        String(title),
      company:      String(company),
      location:     String(location),
      category:     String(category),
      type:         String(type),
      salaryMin:    Number(body.salaryMin) || 0,
      salaryMax:    Number(body.salaryMax) || 0,
      currency:     String(body.currency ?? 'MMK'),
      description:  String(description),
      requirements: Array.isArray(body.requirements) ? body.requirements : [],
      isUrgent:     Boolean(body.isUrgent),
      isFeatured:   Boolean(body.isFeatured),
    });
  } catch (err) {
    console.error('[POST /api/jobs] Sheets append failed:', err);
    return NextResponse.json({ error: 'Failed to write to Google Sheets' }, { status: 502 });
  }

  // ── Fire publish webhook (non-blocking — failure doesn't fail the job) ──
  const PUBLISH_SECRET = process.env.PUBLISH_WEBHOOK_SECRET;
  const SITE_URL       = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  if (PUBLISH_SECRET) {
    // Pass raw fields so the webhook doesn't need to re-query Sheets
    fetch(`${SITE_URL}/api/webhooks/publish-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': PUBLISH_SECRET,
      },
      body: JSON.stringify({
        id:          jobId,
        title:       String(title),
        company:     String(company),
        location:    String(location),
        type:        String(type),
        category:    String(category),
        salaryMin:   Number(body.salaryMin) || 0,
        salaryMax:   Number(body.salaryMax) || 0,
        currency:    String(body.currency ?? 'MMK'),
        description: String(description),
        isUrgent:    Boolean(body.isUrgent),
        postedAt:    new Date().toISOString(),
      }),
    }).catch((err) => console.error('[POST /api/jobs] Webhook trigger failed:', err));
  }

  return NextResponse.json({ ok: true, jobId, socialPostingQueued: !!PUBLISH_SECRET }, { status: 201 });
}
