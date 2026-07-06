import { requireTabAccess } from '@/lib/auth';
import { getCandidates } from '@/lib/db';
import { logFailure } from '@/lib/observability';

export async function GET() {
  if (!(await requireTabAccess('candidates', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const candidates = await getCandidates();
    return Response.json(candidates, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates', message: 'Failed to load candidates', error: err });
    return Response.json(
      { error: 'Failed to load candidates. Check server configuration.' },
      { status: 503 },
    );
  }
}
