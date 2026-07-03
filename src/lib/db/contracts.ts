import { supabase } from '@/lib/supabase';
import type { Contract, ContractType, ContractStatus } from '@/types';

function mapToContract(row: Record<string, unknown>): Contract {
  return {
    id:           row.id as string,
    companyId:    row.company_id as string,
    value:        Number(row.value ?? 0),
    currency:     (row.currency as string) ?? 'MMK',
    contractType: ((row.contract_type as string) ?? 'Retainer') as ContractType,
    status:       ((row.status as string) ?? 'Draft') as ContractStatus,
    startDate:    (row.start_date as string) ?? null,
    endDate:      (row.end_date as string) ?? null,
    cseId:        (row.cse_id as string) ?? null,
    notes:        (row.notes as string) ?? '',
    createdAt:    row.created_at as string,
  };
}

export async function getContracts(companyId?: string, cseRepId?: string): Promise<Contract[]> {
  let query = supabase.from('contracts').select('*').order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  if (cseRepId)  query = query.eq('cse_id', cseRepId);

  const { data, error } = await query;
  if (error) {
    console.error('[db/contracts] getContracts error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToContract);
}

export async function appendContract(data: {
  companyId:     string;
  value:         number;
  currency?:     string;
  contractType?: string;
  status?:       string;
  startDate?:    string;
  endDate?:      string;
  cseId?:        string;
  notes?:        string;
}): Promise<string> {
  const id = `ct-${Date.now()}`;

  const { error } = await supabase.from('contracts').insert({
    id,
    company_id:    data.companyId,
    value:         data.value,
    currency:      data.currency ?? 'MMK',
    contract_type: data.contractType ?? 'Retainer',
    status:        data.status ?? 'Draft',
    start_date:    data.startDate ?? null,
    end_date:      data.endDate ?? null,
    cse_id:        data.cseId ?? null,
    notes:         data.notes ?? null,
  });

  if (error) throw new Error(`Failed to insert contract: ${error.message}`);
  return id;
}

export async function updateContract(
  id: string,
  data: Partial<{
    value:        number;
    currency:     string;
    contractType: string;
    status:       string;
    startDate:    string;
    endDate:      string;
    cseId:        string;
    notes:        string;
  }>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.value        !== undefined) update.value = data.value;
  if (data.currency     !== undefined) update.currency = data.currency;
  if (data.contractType !== undefined) update.contract_type = data.contractType;
  if (data.status       !== undefined) update.status = data.status;
  if (data.startDate    !== undefined) update.start_date = data.startDate;
  if (data.endDate      !== undefined) update.end_date = data.endDate;
  if (data.cseId        !== undefined) update.cse_id = data.cseId;
  if (data.notes        !== undefined) update.notes = data.notes;

  const { error } = await supabase.from('contracts').update(update).eq('id', id);
  if (error) throw new Error(`Failed to update contract: ${error.message}`);
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete contract: ${error.message}`);
}
