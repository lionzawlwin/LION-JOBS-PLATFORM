import { requireRole } from '@/lib/auth';
import { listAuditLog } from '@/lib/db';
import { parseAuditLogQuery } from '@/lib/auditLogQuery';
import type { AuditLogEntry } from '@/types';
import type { NextRequest } from 'next/server';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function toCsv(entries: AuditLogEntry[]): string {
  const header = ['id', 'createdAt', 'actorEmail', 'action', 'domain', 'entityType', 'entityId'];
  const rows = entries.map((e) => [e.id, e.createdAt, e.actorEmail, e.action, e.domain, e.entityType, e.entityId]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

export async function GET(req: NextRequest) {
  if (!(await requireRole(['owner', 'admin']))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const parsed = parseAuditLogQuery(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 422 });
  }

  const { format, ...filters } = parsed.filters;
  const { entries, totalCount } = await listAuditLog(filters);

  if (format === 'csv') {
    return new Response(toCsv(entries), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="audit-log.csv"',
        'Cache-Control': 'no-store',
      },
    });
  }

  return Response.json({ entries, totalCount }, { headers: { 'Cache-Control': 'no-store' } });
}
