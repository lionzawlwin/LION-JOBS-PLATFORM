import { supabase } from '@/lib/supabase';
import type { CseRep } from '@/types';

function mapToCseRep(row: Record<string, unknown>): CseRep {
  return {
    id:        row.id as string,
    name:      row.name as string,
    phone:     (row.phone as string) ?? '',
    email:     (row.email as string) ?? '',
    active:    (row.active as boolean) ?? true,
    createdAt: row.created_at as string,
  };
}

export async function getCseReps(): Promise<CseRep[]> {
  const { data, error } = await supabase
    .from('cse_reps')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[db/cse] getCseReps error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToCseRep);
}

export async function appendCseRep(data: {
  name:   string;
  phone?: string;
  email?: string;
}): Promise<string> {
  const id = `cse-${Date.now()}`;

  const { error } = await supabase.from('cse_reps').insert({
    id,
    name:   data.name,
    phone:  data.phone ?? null,
    email:  data.email ?? null,
    active: true,
  });

  if (error) throw new Error(`Failed to insert CSE: ${error.message}`);
  return id;
}

export async function updateCseRep(
  id: string,
  data: Partial<{ name: string; phone: string; email: string; active: boolean }>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.name   !== undefined) update.name = data.name;
  if (data.phone  !== undefined) update.phone = data.phone;
  if (data.email  !== undefined) update.email = data.email;
  if (data.active !== undefined) update.active = data.active;

  const { error } = await supabase.from('cse_reps').update(update).eq('id', id);
  if (error) throw new Error(`Failed to update CSE: ${error.message}`);
}

export async function deleteCseRep(id: string): Promise<void> {
  const { error } = await supabase.from('cse_reps').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete CSE: ${error.message}`);
}
