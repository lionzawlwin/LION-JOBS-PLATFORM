import { getCandidates } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET(_req: NextRequest) {
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
