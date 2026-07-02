import { deleteJob } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth';

// ── DELETE /api/jobs/[id] ─────────────────────────────────────────
// Removes the job row from the database.
// Requires header:  x-admin-key: <ADMIN_KEY env var>
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('manage-jobs', 'manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ADMIN_KEY = process.env.ADMIN_KEY;
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: 'ADMIN_KEY is not configured on the server.' }, { status: 503 });
  }
  if (req.headers.get('x-admin-key') !== ADMIN_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await deleteJob(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/jobs/[id]]', err);
    return NextResponse.json({ error: 'Failed to delete job' }, { status: 502 });
  }
}
