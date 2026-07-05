import { supabase } from '@/lib/supabase';
import type { AuditLogEntry, AuditAction } from '@/types';

function mapToAuditLogEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id:         row.id as string,
    actorEmail: row.actor_email as string,
    action:     row.action as AuditAction,
    domain:     row.domain as string,
    entityType: row.entity_type as string,
    entityId:   row.entity_id as string,
    createdAt:  row.created_at as string,
  };
}

export async function appendAuditLog(data: {
  actorEmail: string;
  action:     AuditAction;
  domain:     string;
  entityType: string;
  entityId:   string;
}): Promise<void> {
  const id = `aud-${crypto.randomUUID()}`;

  const { error } = await supabase.from('audit_log').insert({
    id,
    actor_email: data.actorEmail,
    action:      data.action,
    domain:      data.domain,
    entity_type: data.entityType,
    entity_id:   data.entityId,
  });

  if (error) console.error('[db/auditLog] appendAuditLog failed:', error.message);
}

export interface AuditLogListFilters {
  domain?: string;
  action?: AuditAction;
  actorEmail?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLog(filters: AuditLogListFilters = {}): Promise<{ entries: AuditLogEntry[]; totalCount: number }> {
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  let query = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.domain) query = query.eq('domain', filters.domain);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.actorEmail) query = query.ilike('actor_email', `%${filters.actorEmail}%`);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  // Free-text search spans entity_type/entity_id -- the two fields a
  // staff member is most likely to recognise (e.g. "candidate" / "app-42").
  if (filters.q) query = query.or(`entity_type.ilike.%${filters.q}%,entity_id.ilike.%${filters.q}%`);

  const { data, error, count } = await query;
  if (error) {
    console.error('[db/auditLog] listAuditLog error:', error.message);
    return { entries: [], totalCount: 0 };
  }
  return { entries: (data ?? []).map(mapToAuditLogEntry), totalCount: count ?? 0 };
}
