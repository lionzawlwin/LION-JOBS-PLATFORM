import { getJobs, appendJob } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { secureCompare } from '@/lib/apiSecurity';
import { requireTabAccess } from '@/lib/auth';
import { logFailure } from '@/lib/observability';

// ── GET /api/jobs ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const sp       = req.nextUrl.searchParams;
    const keyword  = sp.get('keyword')?.toLowerCase().trim()  ?? '';
    const category = sp.get('category')?.trim() ?? '';
    const type     = sp.get('type')?.trim()     ?? '';
    const location = sp.get('location')?.toLowerCase().trim() ?? '';
    const salaryMin = parseInt(sp.get('salaryMin') ?? '0', 10) || 0;
    const salaryMax = parseInt(sp.get('salaryMax') ?? '0', 10) || 0;

    let jobs = await getJobs();

    const hasFilter = keyword || category || type || location || salaryMin || salaryMax;
    if (hasFilter) {
      jobs = jobs.filter((job) => {
        if (category && job.category !== category)                      return false;
        if (type     && job.type     !== type)                          return false;
        if (location && !job.location.toLowerCase().includes(location)) return false;
        if (salaryMin > 0 && job.salaryMax > 0 && job.salaryMax < salaryMin) return false;
        if (salaryMax > 0 && job.salaryMin > 0 && job.salaryMin > salaryMax) return false;
        if (keyword) {
          const hay = `${job.title} ${job.company} ${job.description}`.toLowerCase();
          if (!hay.includes(keyword)) return false;
        }
        return true;
      });
    }

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
export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('post-job', 'manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (!ADMIN_KEY) {
    return NextResponse.json(
      { error: 'ADMIN_KEY is not configured on the server.' },
      { status: 503 },
    );
  }
  if (!secureCompare(req.headers.get('x-admin-key') ?? '', ADMIN_KEY)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  if (
    String(title).length       > 200  ||
    String(company).length     > 200  ||
    String(location).length    > 200  ||
    String(category).length    > 100  ||
    String(type).length        > 50   ||
    String(description).length > 10_000
  ) {
    return NextResponse.json({ error: 'One or more fields exceed the maximum allowed length.' }, { status: 422 });
  }

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
      benefits:     Array.isArray(body.benefits) ? body.benefits : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logFailure({ category: 'other', route: '/api/jobs', message: `DB write failed: ${msg}`, error: err });
    return NextResponse.json(
      { error: `Failed to save job: ${msg}` },
      { status: 502 },
    );
  }

  const PUBLISH_SECRET = process.env.PUBLISH_WEBHOOK_SECRET;
  const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

  if (PUBLISH_SECRET) {
    fetch(`${SITE_URL}/api/webhooks/publish-job`, {
      method: 'POST',
      headers: {
        'Content-Type':     'application/json',
        'x-webhook-secret': PUBLISH_SECRET,
      },
      body: JSON.stringify({
        id: jobId, title: String(title), company: String(company),
        location: String(location), type: String(type), category: String(category),
        salaryMin: Number(body.salaryMin) || 0, salaryMax: Number(body.salaryMax) || 0,
        currency: String(body.currency ?? 'MMK'), description: String(description),
        isUrgent: Boolean(body.isUrgent), postedAt: new Date().toISOString(),
        benefits: Array.isArray(body.benefits) ? body.benefits : [],
      }),
      signal: AbortSignal.timeout(9_000),
    }).catch((err) => console.error('[POST /api/jobs] Webhook trigger failed:', err));
  }

  return NextResponse.json(
    { ok: true, jobId, socialPostingQueued: !!PUBLISH_SECRET },
    { status: 201 },
  );
}
