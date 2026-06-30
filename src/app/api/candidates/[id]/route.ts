import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { deleteCandidateWithDriveFile } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
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
