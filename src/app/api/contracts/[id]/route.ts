import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateContract, deleteContract } from '@/lib/db';
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
    await updateContract(id, {
      value:        body.value        !== undefined ? Number(body.value) : undefined,
      currency:     body.currency     !== undefined ? String(body.currency) : undefined,
      contractType: body.contractType !== undefined ? String(body.contractType) : undefined,
      status:       body.status       !== undefined ? String(body.status) : undefined,
      startDate:    body.startDate    !== undefined ? String(body.startDate) : undefined,
      endDate:      body.endDate      !== undefined ? String(body.endDate) : undefined,
      cseId:        body.cseId        !== undefined ? String(body.cseId) : undefined,
      notes:        body.notes        !== undefined ? String(body.notes) : undefined,
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
    await deleteContract(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
