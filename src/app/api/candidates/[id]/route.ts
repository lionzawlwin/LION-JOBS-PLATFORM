import { requireTabAccess } from '@/lib/auth';
import { deleteCandidateWithDriveFile } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('candidates', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const result = await deleteCandidateWithDriveFile(id);
    await logAudit({ action: 'delete', domain: 'candidates', entityType: 'candidate', entityId: id });
    return Response.json(result);
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]', message: 'Could not delete candidate', error: err, context: { applicationId: id } });
    return Response.json({ error: 'Could not delete candidate.' }, { status: 502 });
  }
}
