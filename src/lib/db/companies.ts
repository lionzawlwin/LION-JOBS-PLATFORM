import { supabase } from '@/lib/supabase';
import type { Company, CompanyStatus } from '@/types';

function mapToCompany(row: Record<string, unknown>): Company {
  return {
    id:            row.id as string,
    name:          row.name as string,
    contactPerson: (row.contact_person as string) ?? '',
    email:         (row.email as string) ?? '',
    phone:         (row.phone as string) ?? '',
    industry:      (row.industry as string) ?? '',
    city:          (row.city as string) ?? '',
    status:        ((row.status as string) ?? 'Lead') as CompanyStatus,
    notes:         (row.notes as string) ?? '',
    lastContacted: (row.last_contacted as string) ?? '',
    createdAt:     row.created_at as string,
  };
}

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db/companies] getCompanies error:', error.message);
    return [];
  }

  return (data ?? []).map(mapToCompany);
}

export async function appendCompany(data: {
  name:           string;
  contactPerson?: string;
  email?:         string;
  phone?:         string;
  industry?:      string;
  city?:          string;
  status?:        string;
  notes?:         string;
  lastContacted?: string;
}): Promise<string> {
  const id = `co-${Date.now()}`;

  const { error } = await supabase.from('companies').insert({
    id,
    name:           data.name,
    contact_person: data.contactPerson ?? null,
    email:          data.email ?? null,
    phone:          data.phone ?? null,
    industry:       data.industry ?? null,
    city:           data.city ?? null,
    status:         data.status ?? 'Lead',
    notes:          data.notes ?? null,
    last_contacted: data.lastContacted ?? null,
  });

  if (error) throw new Error(`Failed to insert company: ${error.message}`);
  return id;
}

export async function updateCompanyStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<void> {
  const update: Record<string, string> = { status };
  if (notes !== undefined) update.notes = notes;

  const { error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', id);
  if (error) throw new Error(`Failed to update company status: ${error.message}`);
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete company: ${error.message}`);
}
