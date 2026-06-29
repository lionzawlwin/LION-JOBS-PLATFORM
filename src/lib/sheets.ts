import { google } from 'googleapis';
import { cache } from 'react';
import type { Job, Candidate, ApplicationStatus, Company, CompanyStatus } from '@/types';

// Tab names must match your Google Sheet exactly (case-sensitive).
// Override via env vars to avoid touching code when the sheet is renamed.
const JOBS_TAB        = process.env.GOOGLE_JOBS_TAB        ?? 'Jobs';
const CANDIDATES_TAB  = process.env.GOOGLE_CANDIDATES_TAB  ?? 'Pipeline';
const SUBSCRIBERS_TAB = process.env.GOOGLE_SUBSCRIBERS_TAB ?? 'Subscribers';
const COMPANIES_TAB   = process.env.GOOGLE_COMPANIES_TAB   ?? 'Companies';
const B2B_LEADS_TAB   = process.env.GOOGLE_B2B_LEADS_TAB   ?? 'B2B_Leads';

function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY,
  );
}

function parsePrivateKey(raw: string): string {
  return raw
    .replace(/^["']|["']$/g, '')  // strip accidental surrounding quotes
    .replace(/\\n/g, '\n')         // unescape literal \n from .env.local format
    .trim();
}

function getSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY
    ? parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY)
    : undefined;

  if (!email || !key) {
    throw new Error(
      'Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY.',
    );
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// ── Jobs column map (A=0 … T=19) ─────────────────────────────────
//
// Row 1 of the "Jobs" tab MUST contain these headers in this exact order:
//   job_id | title | company | category | type | location |
//   salary_min | salary_max | currency | description | requirements |
//   posted_at | deadline | is_urgent | is_featured | status |
//   source | applications_count | hired_count | notes
//
// v2 changes from original layout:
//   • category   D(3)  — was E(4)
//   • type       E(4)  — was F(5)
//   • location   F(5)  — was D(3)
//   • deadline   M(12) — new column
//   • is_urgent  N(13) — was M(12)
//   • is_featured O(14) — was N(13)
//   • status / source / notes — new columns P–T
//   • R(17) and S(18) are COUNTIF formula columns — never written by the API
//
const JOB_COL = {
  job_id:             0,
  title:              1,
  company:            2,
  category:           3,
  type:               4,
  location:           5,
  salary_min:         6,
  salary_max:         7,
  currency:           8,
  description:        9,
  requirements:      10,
  posted_at:         11,
  deadline:          12,
  is_urgent:         13,
  is_featured:       14,
  status:            15,
  source:            16,
  applications_count:    17,
  hired_count:           18,
  notes:                 19,
  screening_questions:   20,
  benefits:              21,
} as const;

// cache() deduplicates calls within a single server render (generateMetadata + page).
export const getJobs = cache(async function getJobs(): Promise<Job[]> {
  if (!isConfigured()) {
    console.warn('[sheets] getJobs: Google Sheets env vars not configured — returning empty list.');
    return [];
  }

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${JOBS_TAB}!A2:V`,
  });

  if (!data.values?.length) {
    console.warn(`[sheets] getJobs: No data rows found in ${JOBS_TAB}!A2:T — check row 1 is a header row and data starts at row 2.`);
    return [];
  }

  return data.values
    .filter((row) => row[JOB_COL.job_id] && row[JOB_COL.title])
    .map((row, i) => ({
      id:          row[JOB_COL.job_id]      || `job-${i}`,
      title:       row[JOB_COL.title]       || '',
      company:     row[JOB_COL.company]     || '',
      location:    row[JOB_COL.location]    || '',
      category:    (row[JOB_COL.category]   as Job['category']) || 'Other',
      type:        (row[JOB_COL.type]       as Job['type'])     || 'Full-time',
      salaryMin:   Number(row[JOB_COL.salary_min])  || 0,
      salaryMax:   Number(row[JOB_COL.salary_max])  || 0,
      currency:    row[JOB_COL.currency]    || 'MMK',
      description: row[JOB_COL.description] || '',
      requirements: row[JOB_COL.requirements]
        ? String(row[JOB_COL.requirements]).split('|').map((r: string) => r.trim()).filter(Boolean)
        : [],
      postedAt:   row[JOB_COL.posted_at]   || new Date().toISOString(),
      isUrgent:          String(row[JOB_COL.is_urgent]).toUpperCase()   === 'TRUE',
      isFeatured:        String(row[JOB_COL.is_featured]).toUpperCase() === 'TRUE',
      applicationsCount: Number(row[JOB_COL.applications_count]) || 0,
      deadline:          row[JOB_COL.deadline] || undefined,
      screeningQuestions: (() => {
        const raw = row[JOB_COL.screening_questions];
        if (!raw) return undefined;
        try { return JSON.parse(raw); } catch { return undefined; }
      })(),
      benefits: row[JOB_COL.benefits]
        ? String(row[JOB_COL.benefits]).split(',').map((b: string) => b.trim()).filter(Boolean)
        : undefined,
    }));
});

// ── Pipeline column map (A=0 … X=23) ─────────────────────────────
//
// Row 1 of the "Pipeline" tab MUST contain these headers in this exact order:
//   candidate_id | full_name | email | phone | job_id | job_title | company |
//   stage | applied_at | stage_updated_at | assigned_to | interview_date |
//   interview_location | salary_expected | salary_offered | notice_period |
//   source | rating | cv_url | offer_date | start_date | webhook_sent |
//   notes | last_updated
//
// Columns that DID NOT move (Kanban drag-drop depends on these):
//   stage      → H(7)  unchanged — updateCandidateStage() writes here
//   applied_at → I(8)  unchanged
//
// Notable moves from original "Candidates" layout:
//   phone    C(2) → D(3)   email is new at C(2)
//   position D(3) → job_title F(5)
//   cv_url   E(4) → S(18)
//   rating replaces matchScore (same numeric semantics, range 1–5 vs 0–100)
//   notes    J(9) → W(22)
//
const CANDIDATE_COL = {
  candidate_id:       0,
  full_name:          1,
  email:              2,
  phone:              3,
  job_id:             4,
  job_title:          5,
  company:            6,
  stage:              7,
  applied_at:         8,
  stage_updated_at:   9,
  assigned_to:       10,
  interview_date:    11,
  interview_location:12,
  salary_expected:   13,
  salary_offered:    14,
  notice_period:     15,
  source:            16,
  rating:            17,
  cv_url:            18,
  offer_date:        19,
  start_date:        20,
  webhook_sent:      21,
  notes:             22,
  last_updated:      23,
} as const;

// Stages the Kanban board renders columns for. Any value written by Make.com
// or webhooks that isn't in this set falls back to 'Applied' so no candidate
// is silently dropped from the board.
const VALID_STAGES = new Set<ApplicationStatus>(['Applied', 'Shortlisted', 'Interview', 'Hired']);

export async function getCandidates(): Promise<Candidate[]> {
  if (!isConfigured()) {
    console.warn('[sheets] getCandidates: Google Sheets env vars not configured — returning empty list.');
    return [];
  }

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${CANDIDATES_TAB}!A2:X`,
  });

  if (!data.values?.length) return [];

  return data.values
    .filter((row) => row[CANDIDATE_COL.candidate_id] && row[CANDIDATE_COL.full_name])
    .map((row, i) => ({
      id:          row[CANDIDATE_COL.candidate_id] || `cand-${i}`,
      name:        row[CANDIDATE_COL.full_name]    || '',
      email:       row[CANDIDATE_COL.email]        || undefined,
      phone:       row[CANDIDATE_COL.phone]        || '',
      position:    row[CANDIDATE_COL.job_title]    || '',
      company:     row[CANDIDATE_COL.company]      || undefined,
      cvUrl:       row[CANDIDATE_COL.cv_url]       || undefined,
      linkedinUrl: undefined,
      matchScore:  Number(row[CANDIDATE_COL.rating]) || 0,
      stage: (VALID_STAGES.has(row[CANDIDATE_COL.stage] as ApplicationStatus)
        ? row[CANDIDATE_COL.stage]
        : 'Applied') as ApplicationStatus,
      appliedAt:      row[CANDIDATE_COL.applied_at]        || new Date().toISOString(),
      notes:          row[CANDIDATE_COL.notes]              || undefined,
      salaryExpected: row[CANDIDATE_COL.salary_expected]   || undefined,
      interviewDate:  row[CANDIDATE_COL.interview_date]    || undefined,
      source:         row[CANDIDATE_COL.source]            || undefined,
    }));
}

// ── appendCandidate ───────────────────────────────────────────────
// Appends a new row to the Pipeline tab. Builds a full 24-column array,
// padding unused fields with "" so column alignment is never off.
export async function appendCandidate(data: {
  fullName:       string;
  email?:         string;
  phone:          string;
  position:       string;   // maps to job_title (col F)
  jobId?:         string;
  linkedinUrl?:   string;
  cvFileName?:    string;
  expectedSalary?: string;
  notes?:         string;
}): Promise<string> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const id        = `cand-${Date.now()}`;
  const now       = new Date().toISOString();
  const sheets    = getSheets();

  // Build the 24-column row aligned to CANDIDATE_COL indices 0–23.
  // Any field we can't populate at submit time is left as "".
  const row: string[] = [
    id,                              // 0  candidate_id
    data.fullName,                   // 1  full_name
    data.email       ?? '',          // 2  email
    data.phone,                      // 3  phone
    data.jobId       ?? '',          // 4  job_id
    data.position,                   // 5  job_title
    '',                              // 6  company          (filled later by recruiter)
    'Applied',                       // 7  stage
    now,                             // 8  applied_at
    now,                             // 9  stage_updated_at
    '',                              // 10 assigned_to
    '',                              // 11 interview_date
    '',                              // 12 interview_location
    data.expectedSalary ?? '',       // 13 salary_expected
    '',                              // 14 salary_offered
    '',                              // 15 notice_period
    'Website',                       // 16 source
    '',                              // 17 rating
    data.linkedinUrl ?? '',          // 18 cv_url  (LinkedIn URL if provided)
    '',                              // 19 offer_date
    '',                              // 20 start_date
    '',                              // 21 webhook_sent
    [data.cvFileName ? `CV: ${data.cvFileName}` : '', data.notes ?? ''].filter(Boolean).join(' | '),  // 22 notes
    now,                             // 23 last_updated
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId:   process.env.GOOGLE_SHEET_ID!,
    range:           `${CANDIDATES_TAB}!A:X`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody:     { values: [row] },
  });

  return id;
}

// ── appendJob ─────────────────────────────────────────────────────
// Appends a new row to the Jobs tab in the new column order (A=job_id … T=notes).
// Formula columns R(17) and S(18) are left blank — the sheet's COUNTIF formulas
// must be extended manually or via an Apps Script trigger.
export async function appendJob(data: {
  title: string;
  company: string;
  location: string;
  category: string;
  type: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  description: string;
  requirements: string[];   // stored pipe-separated in col K
  isUrgent: boolean;
  isFeatured: boolean;
  benefits?: string[];      // stored comma-separated in col V
}): Promise<string> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const id       = `jb-${Date.now()}`;
  const postedAt = new Date().toISOString();
  const sheets   = getSheets();

  // Row values must align with JOB_COL indices 0–19.
  // Indices 17 (applications_count) and 18 (hired_count) are formula columns — left blank.
  const row: (string | number) [] = [
    id,                                    // 0  job_id
    data.title,                            // 1  title
    data.company,                          // 2  company
    data.category,                         // 3  category  ← was index 4
    data.type,                             // 4  type      ← was index 5
    data.location,                         // 5  location  ← was index 3
    data.salaryMin,                        // 6  salary_min
    data.salaryMax,                        // 7  salary_max
    data.currency,                         // 8  currency
    data.description,                      // 9  description
    data.requirements.join('|'),           // 10 requirements
    postedAt,                              // 11 posted_at
    '',                                    // 12 deadline  (set manually)
    data.isUrgent   ? 'TRUE' : 'FALSE',   // 13 is_urgent  ← was index 12
    data.isFeatured ? 'TRUE' : 'FALSE',   // 14 is_featured ← was index 13
    'Active',                              // 15 status    (default)
    '',                                    // 16 source
    '',                                    // 17 applications_count (formula — leave blank)
    '',                                    // 18 hired_count        (formula — leave blank)
    '',                                    // 19 notes
    '',                                    // 20 screening_questions (set manually)
    (data.benefits ?? []).join(', '),      // 21 benefits (comma-separated)
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${JOBS_TAB}!A:V`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  return id;
}

// ── deleteJob ──────────────────────────────────────────────────────
// Finds the row by job ID (column A) and deletes it from the Jobs tab.
// No column index dependency — job_id has always been column A.
export async function deleteJob(jobId: string): Promise<void> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const sheets        = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

  const meta  = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === JOBS_TAB);
  if (sheet?.properties?.sheetId === undefined) {
    throw new Error(`Sheet tab "${JOBS_TAB}" not found`);
  }
  const numericSheetId = sheet.properties.sheetId;

  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${JOBS_TAB}!A2:A`,
  });
  const rowIndex = data.values?.findIndex((row) => row[0] === jobId) ?? -1;
  if (rowIndex === -1) throw new Error(`Job "${jobId}" not found in sheet`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId:    numericSheetId,
            dimension:  'ROWS',
            startIndex: rowIndex + 1,
            endIndex:   rowIndex + 2,
          },
        },
      }],
    },
  });
}

// ── updateCandidateStage ──────────────────────────────────────────
// Writes the new stage value to column H (stage, index 7) of the Pipeline tab.
// Column H is unchanged from the original layout — no index update required.
export async function updateCandidateStage(
  candidateId: string,
  stage: ApplicationStatus,
): Promise<void> {
  if (!isConfigured()) return;

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${CANDIDATES_TAB}!A2:A`,
  });

  if (!data.values) return;

  const rowIndex = data.values.findIndex((row) => row[0] === candidateId);
  if (rowIndex === -1) return;

  // Column H = stage (CANDIDATE_COL.stage = 7, 1-based = H)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${CANDIDATES_TAB}!H${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[stage]] },
  });
}

// ── appendEmailSubscriber ─────────────────────────────────────────
// Appends a new subscriber row to the Subscribers tab.
// Tab columns: email | category | subscribed_at | source | ip
export async function appendEmailSubscriber(data: {
  email: string;
  category?: string;
  ip?: string;
}): Promise<void> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const sheets = getSheets();
  const now    = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId:    process.env.GOOGLE_SHEET_ID!,
    range:            `${SUBSCRIBERS_TAB}!A:E`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[data.email, data.category ?? 'All', now, 'Website', data.ip ?? '']],
    },
  });
}

// ── getCandidatesByEmailOrPhone ────────────────────────────────────
// Looks up all applications for a given email or phone number.
// Used by the /my-applications self-serve status page.
// Phone matching is partial so +959... matches 09... style variants.
export async function getCandidatesByEmailOrPhone(query: string): Promise<{
  id: string;
  name: string;
  position: string;
  company: string;
  stage: string;
  appliedAt: string;
  stageUpdatedAt: string;
}[]> {
  if (!isConfigured()) return [];

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${CANDIDATES_TAB}!A2:X`,
  });

  if (!data.values?.length) return [];

  const q = query.toLowerCase().trim();
  // Strip common phone prefixes so +959... matches 09...
  const qDigits = q.replace(/\D/g, '').replace(/^(95|0)/, '');

  const matches = data.values.filter((row) => {
    const email = String(row[CANDIDATE_COL.email] ?? '').toLowerCase();
    const phone = String(row[CANDIDATE_COL.phone] ?? '').replace(/\D/g, '').replace(/^(95|0)/, '');
    return email === q || (qDigits.length >= 5 && phone.includes(qDigits));
  });

  return matches
    .map((row) => ({
      id:             String(row[CANDIDATE_COL.candidate_id] ?? ''),
      name:           String(row[CANDIDATE_COL.full_name]    ?? ''),
      position:       String(row[CANDIDATE_COL.job_title]    ?? ''),
      company:        String(row[CANDIDATE_COL.company]      ?? ''),
      stage:          String(row[CANDIDATE_COL.stage]        ?? 'Applied'),
      appliedAt:      String(row[CANDIDATE_COL.applied_at]   ?? ''),
      stageUpdatedAt: String(row[CANDIDATE_COL.stage_updated_at] ?? ''),
    }))
    .filter((c) => c.id)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}

// ── Feedback tab ──────────────────────────────────────────────────
// Columns: feedback_id | candidate_id | company | job_title | rating | experience | would_recommend | submitted_at
const FEEDBACK_TAB = process.env.GOOGLE_FEEDBACK_TAB ?? 'Feedback';

export async function appendFeedback(data: {
  candidateId: string;
  company: string;
  jobTitle: string;
  rating: number;          // 1-5
  experience: string;
  wouldRecommend: boolean;
}): Promise<void> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const sheets = getSheets();
  const id     = `fb-${Date.now()}`;
  const now    = new Date().toISOString();

  await sheets.spreadsheets.values.append({
    spreadsheetId:    process.env.GOOGLE_SHEET_ID!,
    range:            `${FEEDBACK_TAB}!A:H`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        id,
        data.candidateId,
        data.company,
        data.jobTitle,
        data.rating,
        data.experience,
        data.wouldRecommend ? 'Yes' : 'No',
        now,
      ]],
    },
  });
}

export async function getCompanyFeedback(company: string): Promise<{
  averageRating: number;
  totalReviews: number;
  wouldRecommendPct: number;
}> {
  const empty = { averageRating: 0, totalReviews: 0, wouldRecommendPct: 0 };
  if (!isConfigured()) return empty;

  try {
    const sheets = getSheets();
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: `${FEEDBACK_TAB}!A2:H`,
    });

    if (!data.values?.length) return empty;

    // col index 2 = company, col index 4 = rating, col index 6 = would_recommend
    const rows = data.values.filter((row) =>
      String(row[2] ?? '').toLowerCase() === company.toLowerCase(),
    );

    if (rows.length === 0) return empty;

    const ratings           = rows.map((r) => Number(r[4]) || 0).filter((n) => n > 0);
    const recommends        = rows.filter((r) => String(r[6]).toLowerCase() === 'yes').length;
    const averageRating     = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    const wouldRecommendPct = rows.length ? Math.round((recommends / rows.length) * 100) : 0;

    return { averageRating, totalReviews: rows.length, wouldRecommendPct };
  } catch (err) {
    // Feedback tab may not exist yet — fail gracefully rather than breaking SSG
    console.warn('[sheets] getCompanyFeedback: tab may not exist yet —', (err as Error).message);
    return { averageRating: 0, totalReviews: 0, wouldRecommendPct: 0 };
  }
}

// ── Companies (B2B Employer CRM) ─────────────────────────────────
// Tab: Companies | Cols A–K
//   A company_id | B name | C contact_person | D email | E phone
//   F industry   | G city | H status         | I notes
//   J last_contacted | K created_at

export async function getCompanies(): Promise<Company[]> {
  if (!isConfigured()) return [];
  try {
    const sheets = getSheets();
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID!,
      range: `${COMPANIES_TAB}!A2:K`,
    });
    const rows = (res.data.values ?? []) as string[][];
    return rows
      .filter((r) => r[0])
      .map((r) => ({
        id:            r[0]  ?? '',
        name:          r[1]  ?? '',
        contactPerson: r[2]  ?? '',
        email:         r[3]  ?? '',
        phone:         r[4]  ?? '',
        industry:      r[5]  ?? '',
        city:          r[6]  ?? '',
        status:        (r[7] as CompanyStatus) || 'Lead',
        notes:         r[8]  ?? '',
        lastContacted: r[9]  ?? '',
        createdAt:     r[10] ?? '',
      }));
  } catch (err) {
    console.warn('[sheets] getCompanies error:', (err as Error).message);
    return [];
  }
}

export async function appendCompany(data: {
  name:          string;
  contactPerson: string;
  email:         string;
  phone:         string;
  industry:      string;
  city:          string;
  status?:       CompanyStatus;
  notes?:        string;
}): Promise<string> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');
  const id  = `co-${Date.now()}`;
  const now = new Date().toISOString();
  const sheets = getSheets();
  const row = [
    id,
    data.name,
    data.contactPerson,
    data.email,
    data.phone,
    data.industry,
    data.city,
    data.status ?? 'Lead',
    data.notes ?? '',
    now,
    now,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId:    process.env.GOOGLE_SHEET_ID!,
    range:            `${COMPANIES_TAB}!A:K`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody:      { values: [row] },
  });
  return id;
}

// ── B2B Leads (Employer Portal) ───────────────────────────────────
// Tab: B2B_Leads | Cols A–Q
//   A lead_id | B company_name | C industry | D location | E website
//   F contact_name | G contact_title | H work_email | I phone
//   J job_title | K headcount | L work_setup | M salary_budget
//   N urgency | O requirements | P submitted_at | Q status
export async function appendB2bLead(data: {
  companyName:   string;
  industry:      string;
  location:      string;
  website:       string;
  contactName:   string;
  contactTitle:  string;
  workEmail:     string;
  phone:         string;
  jobTitle:      string;
  headcount:     string;
  workSetup:     string;
  salaryBudget:  string;
  urgency:       string;
  requirements:  string;
}): Promise<string> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const id  = `b2b-${Date.now()}`;
  const now = new Date().toISOString();
  const sheets = getSheets();

  const row = [
    id,
    data.companyName,
    data.industry,
    data.location,
    data.website,
    data.contactName,
    data.contactTitle,
    data.workEmail,
    data.phone,
    data.jobTitle,
    data.headcount,
    data.workSetup,
    data.salaryBudget,
    data.urgency,
    data.requirements,
    now,
    'New',
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId:    process.env.GOOGLE_SHEET_ID!,
    range:            `${B2B_LEADS_TAB}!A:Q`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody:      { values: [row] },
  });

  return id;
}

export async function updateCompanyStatus(
  companyId: string,
  status:    CompanyStatus,
  notes?:    string,
): Promise<void> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${COMPANIES_TAB}!A:K`,
  });
  const rows = (res.data.values ?? []) as string[][];
  const rowIndex = rows.findIndex((r) => r[0] === companyId);
  if (rowIndex === -1) throw new Error(`Company ${companyId} not found`);
  const sheetRow = rowIndex + 1;
  const now = new Date().toISOString();
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${COMPANIES_TAB}!H${sheetRow}`, values: [[status]] },
        { range: `${COMPANIES_TAB}!I${sheetRow}`, values: [[notes ?? rows[rowIndex][8] ?? '']] },
        { range: `${COMPANIES_TAB}!J${sheetRow}`, values: [[now]] },
      ],
    },
  });
}
