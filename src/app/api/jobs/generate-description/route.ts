import { NextRequest, NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth';
import { generateJobDraft } from '@/lib/ai/jobDescriptionGenerator';
import { logFailure } from '@/lib/observability';

// POST /api/jobs/generate-description
// Body: { title, category, type, location, companyName, keyPoints? }
// Auth: same gate as posting a job itself (post-job/manage).
export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('post-job', 'manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, category, type, location, companyName, keyPoints } = body as Record<string, unknown>;
  if (!title || !category || !type || !location || !companyName) {
    return NextResponse.json(
      { error: 'Missing required fields: title, category, type, location, companyName' },
      { status: 422 },
    );
  }

  try {
    const draft = await generateJobDraft({
      title:       String(title),
      category:    String(category),
      type:        String(type),
      location:    String(location),
      companyName: String(companyName),
      keyPoints:   typeof keyPoints === 'string' ? keyPoints.slice(0, 1000) : undefined,
    });

    if (!draft) {
      return NextResponse.json(
        { error: 'AI generation is not configured on the server (ANTHROPIC_API_KEY unset).' },
        { status: 503 },
      );
    }

    return NextResponse.json({ ok: true, draft });
  } catch (err) {
    await logFailure({
      category: 'ai_scoring',
      route:    '/api/jobs/generate-description',
      message:  'Job description generation failed',
      error:    err,
    });
    return NextResponse.json({ error: 'Generation failed. Try again or write the description manually.' }, { status: 502 });
  }
}
