import { requireTabAccess } from '@/lib/auth';
import { getCandidates } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
  if (!(await requireTabAccess('candidates', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const candidates = await getCandidates();
    return Response.json(candidates, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    console.error('[/api/candidates]', err);
    return Response.json(
      { error: 'Failed to load candidates. Check server configuration.' },
      { status: 503 },
    );
  }
}
