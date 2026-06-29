import { getJobs, appendJob } from '@/lib/sheets';
import { NextRequest, NextResponse } from 'next/server';

// ── GET /api/jobs ─────────────────────────────────────────────────
// Accepts optional filter query params so the client avoids downloading
// the full dataset on every filter change once the job count grows.
//
// All params are optional — omitting them returns the full dataset
// (backward-compatible with existing SWR hooks / SSR pre-fetch).
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
    console.error('[POST /api/jobs] Sheets append failed:', msg);
    return NextResponse.json(
      { error: `Failed to write to Google Sheets: ${msg}` },
      { status: 502 },
    );
  }

  // Expose the target spreadsheet URL in the response so the admin can
  // immediately verify the write went to the correct sheet.
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${process.env.GOOGLE_SHEET_ID}`;

  const PUBLISH_SECRET = process.env.PUBLISH_WEBHOOK_SECRET;
  // NEXT_PUBLIC_ vars are inlined by Turbopack at build time and become ""
  // (empty string) when unset — "" ?? fallback never fires because "" is not
  // null/undefined.  Use the non-public SITE_URL instead (runtime lookup).
  const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

  if (PUBLISH_SECRET) {
    fetch(`${SITE_URL}/api/webhooks/publish-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    }).catch((err) => console.error('[POST /api/jobs] Webhook trigger failed:', err));
  }

  return NextResponse.json(
    { ok: true, jobId, socialPostingQueued: !!PUBLISH_SECRET, sheetUrl },
    { status: 201 },
  );
}
