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
  interview_location: string | null;
  interviewer_contact: string | null;
  final_agreed_salary: number | null;
  google_drive_cv_url: string | null;
  linkedin_url: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_reasoning: string | null;
  ai_processed_at: string | null;
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
    matchScore:      app.ai_score ?? 0,
    stage:           app.stage as ApplicationStatus,
    appliedAt:       app.applied_at,
    notes:           app.notes ?? undefined,
    salaryExpected:  app.salary_expected ?? undefined,
    interviewDate:   app.interview_date ?? undefined,
    interviewLocation:   app.interview_location ?? undefined,
    interviewerContact:  app.interviewer_contact ?? undefined,
    finalAgreedSalary: app.final_agreed_salary ?? undefined,
    source:          candidate.source ?? undefined,
    cityLocation:    candidate.city_location ?? undefined,
    education:       candidate.education ?? undefined,
    experienceYears: candidate.experience_years ?? undefined,
    currentCompany:  candidate.current_company ?? undefined,
    currentSalary:   candidate.current_salary ?? undefined,
    languages:       candidate.languages ?? undefined,
    skills:          candidate.skills ?? undefined,
    portfolioUrl:    candidate.portfolio_url ?? undefined,
    aiSummary:       app.ai_summary ?? undefined,
    aiReasoning:     app.ai_reasoning ?? undefined,
    aiProcessedAt:   app.ai_processed_at ?? undefined,
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
        notes, salary_expected, interview_date, interview_location, interviewer_contact, final_agreed_salary,
        google_drive_cv_url, linkedin_url,
        ai_score, ai_summary, ai_reasoning, ai_processed_at
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
  const { data, error } = await supabase
    .from('applications')
    .update({ stage, stage_updated_at: new Date().toISOString() })
    .eq('id', applicationId)
    .select('id');
  if (error) throw new Error(`Failed to update stage: ${error.message}`);
  // getCandidates() synthesizes a fake application id (= candidate id) for a
  // candidate with zero real applications (e.g. a Talent Pool submission
  // whose application insert failed) so it still renders in the board. A
  // stage change against that fake id matches no real row here -- .update()
  // reports no error for that, so without this check the caller sees a
  // silent, wrongly-reported success instead of "there's nothing to update."
  if (!data || data.length === 0) {
    throw new Error(`No application found with id ${applicationId} -- this candidate may not be connected to a job.`);
  }
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

export async function saveAiScore(
  applicationId: string,
  score: number,
  summary: string,
  reasoning: string,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({
      ai_score:        score,
      ai_summary:      summary,
      ai_reasoning:    reasoning,
      ai_processed_at: new Date().toISOString(),
    })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to save AI score: ${error.message}`);
}

const CANDIDATE_STATUS_SELECT = `
  id, full_name, email, phone,
  city_location, education, experience_years,
  current_company, current_salary, languages, skills,
  portfolio_url, source, created_at,
  applications (
    id, job_id, job_title, company, stage, applied_at,
    notes, salary_expected, interview_date, interview_location, interviewer_contact, final_agreed_salary,
    google_drive_cv_url, linkedin_url,
    ai_score, ai_summary, ai_reasoning, ai_processed_at
  )
`;

// Layer 24 (AppSec review) fixed two issues in the previous implementation:
// (1) it built the PostgREST filter with raw string interpolation
// (`.or(\`email.ilike.%${query}%,...\`)`) -- user input containing a comma
// or parenthesis can alter the filter's structure, since `.or()` parses its
// argument as a filter expression rather than treating it as a literal
// value. Using `.ilike()`/`.eq()` as builder-method arguments (below) lets
// supabase-js encode the value safely instead.
// (2) `%query%` was a substring match on an unauthenticated, public
// endpoint -- `q=gmail.com` (5+ chars) would return every candidate on
// that email provider, along with their current employer and application
// stage. Candidates checking their own status know their exact email or
// phone, so this now requires an exact (still case-insensitive for email)
// match on either field -- same intended UX, no enumeration surface.
export async function getCandidatesByEmailOrPhone(
  query: string,
): Promise<Candidate[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const [byEmail, byPhone] = await Promise.all([
    supabase.from('candidates').select(CANDIDATE_STATUS_SELECT).ilike('email', normalized),
    supabase.from('candidates').select(CANDIDATE_STATUS_SELECT).eq('phone', normalized),
  ]);

  if (byEmail.error) console.error('[db/candidates] getCandidatesByEmailOrPhone (email) error:', byEmail.error.message);
  if (byPhone.error) console.error('[db/candidates] getCandidatesByEmailOrPhone (phone) error:', byPhone.error.message);

  const seen = new Set<string>();
  const rows = [...(byEmail.data ?? []), ...(byPhone.data ?? [])].filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }) as CandidateRow[];

  return rows.flatMap((candidate) => {
    const apps = candidate.applications ?? [];
    if (apps.length === 0) return [];
    return apps.map((app) => mapToCandidate(candidate, app));
  });
}

// Exact-match lookup for Candidate Portal magic-link login. Deliberately
// not the ilike-partial-match search above -- a login lookup must never
// match more or less than the exact account the caller typed.
export async function getCandidateRecordByEmail(
  email: string,
): Promise<{ id: string; fullName: string } | null> {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, full_name')
    .ilike('email', email.trim())
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id as string, fullName: data.full_name as string };
}

// All applications for one person (by their underlying candidates.id, not
// an applications.id) -- what the Candidate Portal's "My Applications"
// view is built on.
export async function getCandidateApplicationsByCandidateId(
  candidateId: string,
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
        notes, salary_expected, interview_date, interview_location, interviewer_contact, final_agreed_salary,
        google_drive_cv_url, linkedin_url,
        ai_score, ai_summary, ai_reasoning, ai_processed_at
      )
    `)
    .eq('id', candidateId)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error('[db/candidates] getCandidateApplicationsByCandidateId error:', error.message);
    return [];
  }

  const candidate = data as CandidateRow;
  const apps = candidate.applications ?? [];
  return apps.map((app) => mapToCandidate(candidate, app));
}

export async function updateCandidateInterviewDetails(
  applicationId:      string,
  interviewLocation:  string,
  interviewerContact: string,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({
      interview_location:  interviewLocation || null,
      interviewer_contact: interviewerContact || null,
    })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to update interview details: ${error.message}`);
}

export async function getApplicationInterviewLocation(applicationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('interview_location')
    .eq('id', applicationId)
    .maybeSingle();

  if (error || !data) return null;
  return (data.interview_location as string) ?? null;
}

export async function updateCandidateFinalSalary(
  applicationId:     string,
  finalAgreedSalary: number,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ final_agreed_salary: finalAgreedSalary })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to update final agreed salary: ${error.message}`);
}
