import { supabase } from '@/lib/supabase';
import type { Staff, StaffRole } from '@/types';

function mapToStaff(row: Record<string, unknown>): Staff {
  return {
    id:        row.id as string,
    email:     row.email as string,
    name:      row.name as string,
    role:      row.role as StaffRole,
    active:    (row.active as boolean) ?? true,
    cseRepId:  (row.cse_rep_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listStaff(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[db/staff] listStaff error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToStaff);
}

export async function getStaffByEmail(email: string): Promise<Staff | null> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('[db/staff] getStaffByEmail error:', error.message);
    return null;
  }
  return data ? mapToStaff(data) : null;
}

export async function createStaff(data: {
  email: string;
  name:  string;
  role:  StaffRole;
}): Promise<string> {
  const id = `staff-${Date.now()}`;

  const { error } = await supabase.from('staff').insert({
    id,
    email: data.email,
    name:  data.name,
    role:  data.role,
    active: true,
  });

  if (error) throw new Error(`Failed to insert staff member: ${error.message}`);
  return id;
}

export async function updateStaff(
  id: string,
  data: Partial<{ name: string; role: StaffRole; active: boolean; cseRepId: string | null }>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.name     !== undefined) update.name = data.name;
  if (data.role     !== undefined) update.role = data.role;
  if (data.active   !== undefined) update.active = data.active;
  if (data.cseRepId !== undefined) update.cse_rep_id = data.cseRepId;

  const { error } = await supabase.from('staff').update(update).eq('id', id);
  if (error) throw new Error(`Failed to update staff member: ${error.message}`);
}
