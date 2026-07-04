import { requireTabAccess } from '@/lib/auth';
import { listSystemEvents, getCronStatus } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { FailureCategory } from '@/types';

const VALID_CATEGORIES: FailureCategory[] = ['webhook', 'ai_scoring', 'invoicing', 'cron', 'other'];
const VALID_RESOLVED = ['unresolved', 'resolved', 'all'] as const;
type ResolvedFilter = typeof VALID_RESOLVED[number];

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('system-health', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const categoryParam = sp.get('category') ?? undefined;
  const daysParam     = sp.get('days') ?? undefined;
  const resolvedParam = sp.get('resolved') ?? undefined;

  if (categoryParam && !VALID_CATEGORIES.includes(categoryParam as FailureCategory)) {
    return Response.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 422 });
  }

  if (resolvedParam && !VALID_RESOLVED.includes(resolvedParam as ResolvedFilter)) {
    return Response.json({ error: `resolved must be one of: ${VALID_RESOLVED.join(', ')}` }, { status: 422 });
  }

  const days = daysParam ? Number(daysParam) : 7;
  if (!Number.isFinite(days) || days <= 0) {
    return Response.json({ error: 'days must be a positive number' }, { status: 422 });
  }

  const [events, cronStatus] = await Promise.all([
    listSystemEvents({
      category: categoryParam as FailureCategory | undefined,
      days,
      resolved: resolvedParam as ResolvedFilter | undefined,
    }),
    getCronStatus(),
  ]);

  return Response.json({ events, cronStatus }, { headers: { 'Cache-Control': 'no-store' } });
}
