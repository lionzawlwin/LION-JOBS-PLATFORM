import { requireStaff } from '@/lib/auth';
import { deleteCandidateWithDriveFile } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const result = await deleteCandidateWithDriveFile(id);
    return Response.json(result);
  } catch (err) {
    console.error('[candidates/delete]', err);
    return Response.json({ error: 'Could not delete candidate.' }, { status: 502 });
  }
}
