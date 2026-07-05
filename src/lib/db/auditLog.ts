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

export async function listAuditLog(filters: { domain?: string } = {}): Promise<AuditLogEntry[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters.domain) query = query.eq('domain', filters.domain);

  const { data, error } = await query;
  if (error) {
    console.error('[db/auditLog] listAuditLog error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToAuditLogEntry);
}
