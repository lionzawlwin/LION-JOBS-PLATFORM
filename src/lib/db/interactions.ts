import { supabase } from '@/lib/supabase';
import type { Interaction, InteractionType } from '@/types';

function mapToInteraction(row: Record<string, unknown>): Interaction {
  return {
    id:            row.id as string,
    companyId:     row.company_id as string,
    type:          ((row.type as string) ?? 'Other') as InteractionType,
    note:          (row.note as string) ?? '',
    loggedByCseId: (row.logged_by_cse_id as string) ?? null,
    occurredAt:    row.occurred_at as string,
    createdAt:     row.created_at as string,
  };
}

export async function getInteractions(companyId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('company_id', companyId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('[db/interactions] getInteractions error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToInteraction);
}

export async function appendInteraction(data: {
  companyId:      string;
  type:           string;
  note:           string;
  loggedByCseId?: string;
  occurredAt?:    string;
}): Promise<string> {
  const id = `in-${Date.now()}`;

  const { error } = await supabase.from('interactions').insert({
    id,
    company_id:       data.companyId,
    type:             data.type,
    note:             data.note,
    logged_by_cse_id: data.loggedByCseId ?? null,
    occurred_at:      data.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to insert interaction: ${error.message}`);
  return id;
}

export async function deleteInteraction(id: string): Promise<void> {
  const { error } = await supabase.from('interactions').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete interaction: ${error.message}`);
}

// Layer 24 (AppSec review): lets DELETE /api/interactions/[id] check CSE
// ownership before deleting -- the row only carries company_id, not the
// full Interaction shape, so this is cheaper than fetching everything.
export async function getInteractionCompanyId(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('interactions')
    .select('company_id')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data.company_id as string;
}
