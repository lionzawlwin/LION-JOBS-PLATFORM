import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { deleteB2bLead } from '@/lib/sheets';
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
    await deleteB2bLead(id);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[leads/delete]', err);
    return Response.json({ error: 'Could not delete lead.' }, { status: 502 });
  }
}
