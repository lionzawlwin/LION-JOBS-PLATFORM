import type { AuditAction } from '@/types';

const VALID_ACTIONS: AuditAction[] = ['create', 'update', 'delete'];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

export interface AuditLogFilters {
  domain?: string;
  action?: AuditAction;
  actorEmail?: string;
  q?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
  format: 'json' | 'csv';
}

export type ParsedAuditLogQuery =
  | { ok: true; filters: AuditLogFilters }
  | { ok: false; error: string };

function isValidDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

export function parseAuditLogQuery(searchParams: URLSearchParams): ParsedAuditLogQuery {
  const domain = searchParams.get('domain') ?? undefined;
  const actorEmail = searchParams.get('actor') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const actionParam = searchParams.get('action') ?? undefined;
  const formatParam = searchParams.get('format') ?? 'json';
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  if (actionParam && !VALID_ACTIONS.includes(actionParam as AuditAction)) {
    return { ok: false, error: `action must be one of: ${VALID_ACTIONS.join(', ')}` };
  }

  if (from && !isValidDate(from)) {
    return { ok: false, error: 'from must be a valid date' };
  }

  if (to && !isValidDate(to)) {
    return { ok: false, error: 'to must be a valid date' };
  }

  if (from && to && new Date(to).getTime() < new Date(from).getTime()) {
    return { ok: false, error: 'to must not be before from' };
  }

  if (formatParam !== 'json' && formatParam !== 'csv') {
    return { ok: false, error: "format must be 'json' or 'csv'" };
  }

  let limit = DEFAULT_LIMIT;
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return { ok: false, error: 'limit must be a positive number' };
    }
    limit = Math.min(parsed, MAX_LIMIT);
  }

  let offset = 0;
  if (offsetParam !== null) {
    const parsed = Number(offsetParam);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ok: false, error: 'offset must be a non-negative number' };
    }
    offset = parsed;
  }

  return {
    ok: true,
    filters: {
      domain,
      action: actionParam as AuditAction | undefined,
      actorEmail,
      q,
      from,
      to,
      limit,
      offset,
      format: formatParam,
    },
  };
}
