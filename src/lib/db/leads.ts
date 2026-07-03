import { supabase } from '@/lib/supabase';
import type { B2bLead } from '@/types';

function mapToLead(row: Record<string, unknown>): B2bLead {
  return {
    id:             row.id as string,
    companyName:    row.company_name as string,
    industry:       (row.industry as string) ?? '',
    location:       (row.location as string) ?? '',
    website:        (row.website as string) ?? '',
    contactName:    row.contact_name as string,
    contactTitle:   (row.contact_title as string) ?? '',
    workEmail:      row.work_email as string,
    phone:          row.phone as string,
    jobTitle:       row.job_title as string,
    headcount:      (row.headcount as string) ?? '',
    workSetup:      (row.work_setup as string) ?? '',
    salaryBudget:   (row.salary_budget as string) ?? '',
    urgency:        (row.urgency as string) ?? '',
    requirements:   (row.requirements as string) ?? '',
    agencyMessage:  (row.agency_message as string) ?? '',
    jobDescription: (row.job_description as string) ?? '',
    benefits:       (row.benefits as string) ?? '',
    submittedAt:    row.submitted_at as string,
    statusUpdatedAt: row.status_updated_at as string,
    status:         (row.status as string) ?? 'New',
  };
}

export async function getB2bLeads(): Promise<B2bLead[]> {
  const { data, error } = await supabase
    .from('b2b_leads')
    .select('*')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[db/leads] getB2bLeads error:', error.message);
    return [];
  }

  return (data ?? []).map(mapToLead);
}

export async function appendB2bLead(data: {
  companyName:    string;
  industry?:      string;
  location?:      string;
  website?:       string;
  contactName:    string;
  contactTitle?:  string;
  workEmail:      string;
  phone:          string;
  jobTitle:       string;
  headcount?:     string;
  workSetup?:     string;
  salaryBudget?:  string;
  urgency?:       string;
  requirements?:  string;
  agencyMessage?: string;
  jobDescription?: string;
  benefits?:      string;
}): Promise<string> {
  const id = `ld-${Date.now()}`;

  const { error } = await supabase.from('b2b_leads').insert({
    id,
    company_name:    data.companyName,
    industry:        data.industry ?? null,
    location:        data.location ?? null,
    website:         data.website ?? null,
    contact_name:    data.contactName,
    contact_title:   data.contactTitle ?? null,
    work_email:      data.workEmail,
    phone:           data.phone,
    job_title:       data.jobTitle,
    headcount:       data.headcount ?? null,
    work_setup:      data.workSetup ?? null,
    salary_budget:   data.salaryBudget ?? null,
    urgency:         data.urgency ?? null,
    requirements:    data.requirements ?? null,
    agency_message:  data.agencyMessage ?? null,
    job_description: data.jobDescription ?? null,
    benefits:        data.benefits ?? null,
    status:          'New',
  });

  if (error) throw new Error(`Failed to insert lead: ${error.message}`);
  return id;
}

export async function updateB2bLeadStatus(
  id: string,
  status: string,
): Promise<void> {
  const { error } = await supabase
    .from('b2b_leads')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to update lead status: ${error.message}`);
}

export async function deleteB2bLead(id: string): Promise<void> {
  const { error } = await supabase.from('b2b_leads').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete lead: ${error.message}`);
}
