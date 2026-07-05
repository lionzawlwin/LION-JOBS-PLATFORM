import { requireRole } from '@/lib/auth';
import { listAuditLog } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  if (!(await requireRole(['owner', 'admin']))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const domain = req.nextUrl.searchParams.get('domain') ?? undefined;
  const entries = await listAuditLog({ domain });
  return Response.json(entries, { headers: { 'Cache-Control': 'no-store' } });
}
