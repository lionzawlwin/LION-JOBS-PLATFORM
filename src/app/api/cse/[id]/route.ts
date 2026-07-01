import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCseRep, deleteCseRep } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    await updateCseRep(id, {
      name:   body.name   !== undefined ? String(body.name) : undefined,
      phone:  body.phone  !== undefined ? String(body.phone) : undefined,
      email:  body.email  !== undefined ? String(body.email) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteCseRep(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
