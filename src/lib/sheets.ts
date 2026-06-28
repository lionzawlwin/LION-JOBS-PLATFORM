import { google } from 'googleapis';
import { cache } from 'react';
import type { Job, Candidate, ApplicationStatus } from '@/types';

// Tab names must match your Google Sheet exactly (case-sensitive).
// Override via env vars to avoid touching code when the sheet is renamed.
const JOBS_TAB       = process.env.GOOGLE_JOBS_TAB       ?? 'Jobs';
const CANDIDATES_TAB = process.env.GOOGLE_CANDIDATES_TAB ?? 'Pipeline';

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
  applications_count:17,
  hired_count:       18,
  notes:             19,
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
    range: `${JOBS_TAB}!A2:T`,
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
      isUrgent:   String(row[JOB_COL.is_urgent]).toUpperCase()   === 'TRUE',
      isFeatured: String(row[JOB_COL.is_featured]).toUpperCase() === 'TRUE',
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
      // job_title is the candidate's applied-for position (replaces old "position" field)
      position:    row[CANDIDATE_COL.job_title]    || '',
      cvUrl:       row[CANDIDATE_COL.cv_url]       || undefined,
      linkedinUrl: undefined,  // field removed from Pipeline tab; kept in type for API compatibility
      matchScore:  Number(row[CANDIDATE_COL.rating]) || 0,
      stage: (VALID_STAGES.has(row[CANDIDATE_COL.stage] as ApplicationStatus)
        ? row[CANDIDATE_COL.stage]
        : 'Applied') as ApplicationStatus,
      appliedAt: row[CANDIDATE_COL.applied_at] || new Date().toISOString(),
      notes:     row[CANDIDATE_COL.notes]      || undefined,
    }));
}

// ── appendCandidate ───────────────────────────────────────────────
// Appends a new row to the Pipeline tab. Builds a full 24-column array,
// padding unused fields with "" so column alignment is never off.
export async function appendCandidate(data: {
  fullName:    string;
  email?:      string;
  phone:       string;
  position:    string;   // maps to job_title (col F)
  jobId?:      string;
  linkedinUrl?: string;
  cvFileName?:  string;
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
    '',                              // 13 salary_expected
    '',                              // 14 salary_offered
    '',                              // 15 notice_period
    'Website',                       // 16 source
    '',                              // 17 rating
    data.linkedinUrl ?? '',          // 18 cv_url  (LinkedIn URL if provided)
    '',                              // 19 offer_date
    '',                              // 20 start_date
    '',                              // 21 webhook_sent
    data.cvFileName  ? `CV uploaded: ${data.cvFileName}` : '',  // 22 notes
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
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${JOBS_TAB}!A:T`,
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
