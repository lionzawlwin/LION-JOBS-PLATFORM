import { supabase } from '@/lib/supabase';
import { google } from 'googleapis';
import type { Candidate, ApplicationStatus } from '@/types';

// ── Drive helper (inline to avoid modifying drive.ts) ─────────────────────
function getDriveForDeletion() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !rawKey) return null;

  const key = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

// ── Shape of a joined applications row ────────────────────────────────────
interface AppRow {
  id: string;
  job_id: string | null;
  job_title: string;
  company: string | null;
  stage: string;
  applied_at: string;
  notes: string | null;
  salary_expected: string | null;
  interview_date: string | null;
  google_drive_cv_url: string | null;
  linkedin_url: string | null;
}

interface CandidateRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  city_location: string | null;
  education: string | null;
  experience_years: string | null;
  current_company: string | null;
  current_salary: string | null;
  languages: string | null;
  skills: string | null;
  portfolio_url: string | null;
  source: string | null;
  created_at: string;
  applications: AppRow[];
}

function mapToCandidate(candidate: CandidateRow, app: AppRow): Candidate {
  return {
    id:              app.id,
    name:            candidate.full_name,
    email:           candidate.email ?? undefined,
    phone:           candidate.phone,
    position:        app.job_title,
    jobId:           app.job_id ?? undefined,
    company:         app.company ?? undefined,
    cvUrl:           app.google_drive_cv_url ?? undefined,
    linkedinUrl:     app.linkedin_url ?? undefined,
    matchScore:      0,
    stage:           app.stage as ApplicationStatus,
    appliedAt:       app.applied_at,
    notes:           app.notes ?? undefined,
    salaryExpected:  app.salary_expected ?? undefined,
    interviewDate:   app.interview_date ?? undefined,
    source:          candidate.source ?? undefined,
    cityLocation:    candidate.city_location ?? undefined,
    education:       candidate.education ?? undefined,
    experienceYears: candidate.experience_years ?? undefined,
    currentCompany:  candidate.current_company ?? undefined,
    currentSalary:   candidate.current_salary ?? undefined,
    languages:       candidate.languages ?? undefined,
    skills:          candidate.skills ?? undefined,
    portfolioUrl:    candidate.portfolio_url ?? undefined,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select(`
      id, full_name, email, phone,
      city_location, education, experience_years,
      current_company, current_salary, languages, skills,
      portfolio_url, source, created_at,
      applications (
        id, job_id, job_title, company, stage, applied_at,
        notes, salary_expected, interview_date,
        google_drive_cv_url, linkedin_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db/candidates] getCandidates error:', error.message);
    return [];
  }

  return (data as CandidateRow[]).flatMap((candidate) => {
    const apps = candidate.applications ?? [];
    if (apps.length === 0) {
      return [{
        id:              candidate.id,
        name:            candidate.full_name,
        email:           candidate.email ?? undefined,
        phone:           candidate.phone,
        position:        '',
        matchScore:      0,
        stage:           'Applied' as ApplicationStatus,
        appliedAt:       candidate.created_at,
        source:          candidate.source ?? undefined,
        cityLocation:    candidate.city_location ?? undefined,
        education:       candidate.education ?? undefined,
        experienceYears: candidate.experience_years ?? undefined,
        currentCompany:  candidate.current_company ?? undefined,
        currentSalary:   candidate.current_salary ?? undefined,
        languages:       candidate.languages ?? undefined,
        skills:          candidate.skills ?? undefined,
        portfolioUrl:    candidate.portfolio_url ?? undefined,
      } satisfies Candidate];
    }
    return apps.map((app) => mapToCandidate(candidate, app));
  });
}

// Returns the applicationId (used as Candidate.id in the UI)
export async function appendCandidate(data: {
  fullName:        string;
  email?:          string;
  phone:           string;
  position:        string;
  jobId?:          string;
  linkedinUrl?:    string;
  cvFileName?:     string;
  expectedSalary?: string;
  notes?:          string;
  noticePeriod?:   string;
  cityLocation?:   string;
  education?:      string;
  experienceYears?: string;
  currentCompany?: string;
  currentSalary?:  string;
  languages?:      string;
  skills?:         string;
  portfolioUrl?:   string;
}): Promise<string> {
  const ts = Date.now();
  const candidateId   = `cd-${ts}-${Math.random().toString(36).slice(2, 6)}`;
  const applicationId = `ap-${ts}-${Math.random().toString(36).slice(2, 6)}`;

  const { error: candError } = await supabase.from('candidates').insert({
    id:               candidateId,
    full_name:        data.fullName,
    email:            data.email ?? null,
    phone:            data.phone,
    city_location:    data.cityLocation ?? null,
    education:        data.education ?? null,
    experience_years: data.experienceYears ?? null,
    current_company:  data.currentCompany ?? null,
    current_salary:   data.currentSalary ?? null,
    languages:        data.languages ?? null,
    skills:           data.skills ?? null,
    portfolio_url:    data.portfolioUrl ?? null,
  });
  if (candError) throw new Error(`Failed to insert candidate: ${candError.message}`);

  const { error: appError } = await supabase.from('applications').insert({
    id:              applicationId,
    candidate_id:    candidateId,
    job_id:          data.jobId ?? null,
    job_title:       data.position,
    linkedin_url:    data.linkedinUrl ?? null,
    salary_expected: data.expectedSalary ?? null,
    notice_period:   data.noticePeriod ?? null,
    notes:           data.notes ?? null,
    stage:           'Applied',
  });
  if (appError) throw new Error(`Failed to insert application: ${appError.message}`);

  return applicationId;
}

export async function updateCandidateCvUrl(
  applicationId: string,
  cvUrl: string,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ google_drive_cv_url: cvUrl })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to update cv_url: ${error.message}`);
}

export async function updateCandidateStage(
  applicationId: string,
  stage: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ stage, stage_updated_at: new Date().toISOString() })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to update stage: ${error.message}`);
}

export async function updateCandidateJob(
  applicationId: string,
  jobId: string,
  jobTitle: string,
  company: string,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ job_id: jobId, job_title: jobTitle, company })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to update candidate job: ${error.message}`);
}

export async function deleteCandidate(applicationId: string): Promise<void> {
  // Resolve candidate_id from application, then delete the candidate (cascades to applications)
  const { data, error: fetchError } = await supabase
    .from('applications')
    .select('candidate_id')
    .eq('id', applicationId)
    .single();

  if (fetchError || !data) {
    throw new Error(`Candidate not found for application ${applicationId}`);
  }

  const { error } = await supabase
    .from('candidates')
    .delete()
    .eq('id', data.candidate_id);
  if (error) throw new Error(`Failed to delete candidate: ${error.message}`);
}

export async function deleteCandidateWithDriveFile(
  applicationId: string,
): Promise<{ ok: boolean; driveFileDeleted: boolean }> {
  // 1. Fetch cv_url and candidate_id
  const { data: appData, error: fetchError } = await supabase
    .from('applications')
    .select('candidate_id, google_drive_cv_url')
    .eq('id', applicationId)
    .single();

  if (fetchError || !appData) {
    throw new Error(`Application ${applicationId} not found`);
  }

  const { candidate_id, google_drive_cv_url } = appData;

  // 2. Delete Drive file if cv_url is present
  let driveFileDeleted = false;
  if (google_drive_cv_url) {
    const fileId = extractDriveFileId(google_drive_cv_url);
    if (fileId) {
      const drive = getDriveForDeletion();
      if (drive) {
        try {
          await drive.files.delete({ fileId });
          driveFileDeleted = true;
        } catch (err: unknown) {
          const status = (err as { code?: number })?.code;
          if (status === 404) {
            console.warn(`[deleteCandidateWithDriveFile] Drive file ${fileId} already gone — continuing`);
          } else {
            console.error(`[deleteCandidateWithDriveFile] Drive delete error (non-fatal):`, err);
          }
        }
      }
    }
  }

  // 3. Delete candidate (CASCADE deletes all applications)
  const { error: deleteError } = await supabase
    .from('candidates')
    .delete()
    .eq('id', candidate_id);

  if (deleteError) throw new Error(`Failed to delete candidate: ${deleteError.message}`);

  return { ok: true, driveFileDeleted };
}

export async function getCandidatesByEmailOrPhone(
  query: string,
): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select(`
      id, full_name, email, phone,
      city_location, education, experience_years,
      current_company, current_salary, languages, skills,
      portfolio_url, source, created_at,
      applications (
        id, job_id, job_title, company, stage, applied_at,
        notes, salary_expected, interview_date,
        google_drive_cv_url, linkedin_url
      )
    `)
    .or(`email.ilike.%${query}%,phone.ilike.%${query}%`);

  if (error) {
    console.error('[db/candidates] getCandidatesByEmailOrPhone error:', error.message);
    return [];
  }

  return (data as CandidateRow[]).flatMap((candidate) => {
    const apps = candidate.applications ?? [];
    if (apps.length === 0) return [];
    return apps.map((app) => mapToCandidate(candidate, app));
  });
}
