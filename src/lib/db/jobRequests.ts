import { supabase } from '@/lib/supabase';
import { appendJob } from './jobs';
import { getCompanyById } from './companies';
import type { JobRequest, JobRequestStatus, JobCategory, JobType } from '@/types';

function mapToJobRequest(row: Record<string, unknown>): JobRequest {
  return {
    id:            row.id as string,
    companyId:     row.company_id as string,
    title:         row.title as string,
    location:      row.location as string,
    category:      row.category as JobCategory,
    type:          row.type as JobType,
    salaryMin:     row.salary_min as number,
    salaryMax:     row.salary_max as number,
    currency:      row.currency as string,
    description:   row.description as string,
    requirements:  (row.requirements as string[]) ?? [],
    status:        row.status as JobRequestStatus,
    submittedAt:   row.submitted_at as string,
    reviewedBy:    (row.reviewed_by as string | null) ?? null,
    reviewedAt:    (row.reviewed_at as string | null) ?? null,
    rejectionNote: (row.rejection_note as string | null) ?? null,
  };
}

export async function appendJobRequest(data: {
  companyId:    string;
  title:        string;
  location:     string;
  category:     string;
  type:         string;
  salaryMin:    number;
  salaryMax:    number;
  currency:     string;
  description:  string;
  requirements: string[];
}): Promise<string> {
  const id = `jr-${crypto.randomUUID()}`;

  const { error } = await supabase.from('job_requests').insert({
    id,
    company_id:   data.companyId,
    title:        data.title,
    location:     data.location,
    category:     data.category,
    type:         data.type,
    salary_min:   data.salaryMin,
    salary_max:   data.salaryMax,
    currency:     data.currency,
    description:  data.description,
    requirements: data.requirements,
  });

  if (error) throw new Error(`Failed to insert job request: ${error.message}`);
  return id;
}

export async function listJobRequestsForCompany(companyId: string): Promise<JobRequest[]> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[db/jobRequests] listJobRequestsForCompany error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToJobRequest);
}

export async function listPendingJobRequests(): Promise<JobRequest[]> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('status', 'Pending')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[db/jobRequests] listPendingJobRequests error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToJobRequest);
}

export async function getJobRequestById(id: string): Promise<JobRequest | null> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[db/jobRequests] getJobRequestById error:', error.message);
    return null;
  }
  if (!data) return null;
  return mapToJobRequest(data);
}

// Approving a request creates the live job (reusing appendJob(), the same
// path the Post Job form uses), then marks the request Approved. These are
// two separate writes, not a transaction: if appendJob() succeeds but the
// job_requests status update below throws, the job will exist while the
// request is left stuck at Pending. This is the same accepted-risk shape as
// candidates.ts's appendCandidate() two-insert pattern, with no rollback here
// either.
//
// Known risk: because nothing on the job_requests row records which job was
// already created, a caller must not blindly retry approveJobRequest(id, ...)
// after a failure. Retrying re-runs appendJob() unconditionally, which would
// create a second live job for the same approval if the first job insert
// already succeeded. A caller should first re-fetch the request and check
// whether its status actually changed before deciding to retry.
export async function approveJobRequest(id: string, reviewedBy: string): Promise<string> {
  const request = await getJobRequestById(id);
  if (!request) throw new Error(`Job request ${id} not found`);
  if (request.status !== 'Pending') throw new Error(`Job request ${id} is not pending`);

  const company = await getCompanyById(request.companyId);
  if (!company) throw new Error(`Company ${request.companyId} not found`);

  const jobId = await appendJob({
    title:        request.title,
    company:      company.name,
    companyId:    request.companyId,
    location:     request.location,
    category:     request.category,
    type:         request.type,
    salaryMin:    request.salaryMin,
    salaryMax:    request.salaryMax,
    currency:     request.currency,
    description:  request.description,
    requirements: request.requirements,
    isUrgent:     false,
    isFeatured:   false,
    benefits:     [],
  });

  const { error } = await supabase
    .from('job_requests')
    .update({ status: 'Approved', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to mark job request approved: ${error.message}`);
  return jobId;
}

export async function rejectJobRequest(id: string, reviewedBy: string, note: string): Promise<void> {
  const request = await getJobRequestById(id);
  if (!request) throw new Error(`Job request ${id} not found`);
  if (request.status !== 'Pending') throw new Error(`Job request ${id} is not pending`);

  const { error } = await supabase
    .from('job_requests')
    .update({ status: 'Rejected', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString(), rejection_note: note })
    .eq('id', id);

  if (error) throw new Error(`Failed to reject job request: ${error.message}`);
}
