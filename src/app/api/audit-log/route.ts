import { requireRole } from '@/lib/auth';
import { listAuditLog, listStaff } from '@/lib/db';
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

// Layer 17 (Audit log compliance export). actorEmail -> "role#<n>" per
// distinct real actor within the exported set, so an external reviewer can
// see how many people had which role touching the log without learning any
// individual's identity. Numbered rather than a bare role name so
// "2 different admins made changes" stays visible instead of collapsing
// into one indistinguishable "admin" row.
async function redactActors(entries: AuditLogEntry[]): Promise<AuditLogEntry[]> {
  const staff = await listStaff();
  const roleByEmail = new Map(staff.map((s) => [s.email.toLowerCase(), s.role]));

  const labelByEmail = new Map<string, string>();
  const seenPerRole = new Map<string, number>();
  function labelFor(email: string): string {
    const key = email.toLowerCase();
    const existing = labelByEmail.get(key);
    if (existing) return existing;
    const role = roleByEmail.get(key) ?? 'unknown';
    const n = (seenPerRole.get(role) ?? 0) + 1;
    seenPerRole.set(role, n);
    const label = `${role}#${n}`;
    labelByEmail.set(key, label);
    return label;
  }

  return entries.map((e) => ({ ...e, actorEmail: labelFor(e.actorEmail) }));
}

export async function GET(req: NextRequest) {
  if (!(await requireRole(['owner', 'admin']))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const parsed = parseAuditLogQuery(req.nextUrl.searchParams);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 422 });
  }

  const { format, redact, ...filters } = parsed.filters;
  const { entries: rawEntries, totalCount } = await listAuditLog(filters);
  const entries = redact ? await redactActors(rawEntries) : rawEntries;

  if (format === 'csv') {
    return new Response(toCsv(entries), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log${redact ? '-redacted' : ''}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return Response.json({ entries, totalCount }, { headers: { 'Cache-Control': 'no-store' } });
}
