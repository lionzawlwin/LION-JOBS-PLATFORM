import { NextResponse } from 'next/server';
import { appendFeedback, getCompanyFeedback } from '@/lib/sheets';

// GET /api/feedback?company=COMPANY_NAME — aggregate rating for company page
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get('company')?.trim();
  if (!company) {
    return NextResponse.json({ error: 'company param required' }, { status: 400 });
  }

  const result = await getCompanyFeedback(company);
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=3600' },
  });
}

// POST /api/feedback — submit interview feedback
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { candidateId, company, jobTitle, rating, experience, wouldRecommend } = body as Record<string, unknown>;

  if (!candidateId || typeof candidateId !== 'string') {
    return NextResponse.json({ error: 'candidateId required' }, { status: 400 });
  }
  if (!company || typeof company !== 'string') {
    return NextResponse.json({ error: 'company required' }, { status: 400 });
  }
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 });
  }
  if (!experience || typeof experience !== 'string' || experience.trim().length < 10) {
    return NextResponse.json({ error: 'experience must be at least 10 characters' }, { status: 400 });
  }

  try {
    await appendFeedback({
      candidateId,
      company,
      jobTitle: typeof jobTitle === 'string' ? jobTitle : '',
      rating,
      experience: experience.trim(),
      wouldRecommend: wouldRecommend === true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save feedback';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
