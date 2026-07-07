import { requireTabAccess } from '@/lib/auth';
import { getRecentApiHealthChecks } from '@/lib/db';
import { summarizeApiHealthChecks } from '@/lib/apiHealthSummary';
import type { NextRequest } from 'next/server';

// System Health tab, API/route health panel (item #4 of the 2026-07-07 CTO
// big-upgrades portfolio). Same access gate as GET /api/system-events --
// this whole tab is owner/admin only (see src/lib/permissions.ts).
export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('system-health', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const hoursParam = sp.get('hours') ?? undefined;
  const hours = hoursParam ? Number(hoursParam) : 24;
  if (!Number.isFinite(hours) || hours <= 0) {
    return Response.json({ error: 'hours must be a positive number' }, { status: 422 });
  }

  const checks = await getRecentApiHealthChecks(hours);
  const summaries = summarizeApiHealthChecks(checks);

  return Response.json({ checks: summaries }, { headers: { 'Cache-Control': 'no-store' } });
}
