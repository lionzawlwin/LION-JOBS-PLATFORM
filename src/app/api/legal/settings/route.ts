import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getAgencySettings, updateAgencySettings } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET() {
  const settings = await getAgencySettings();
  return Response.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    await updateAgencySettings(body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[legal/settings/patch]', err);
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
