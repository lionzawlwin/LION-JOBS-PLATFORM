import { google } from 'googleapis';
import { cache } from 'react';
import type { Job, Candidate, ApplicationStatus } from '@/types';

// Tab names must match your Google Sheet exactly (case-sensitive).
// Override via env vars to avoid touching code when the sheet is renamed.
const JOBS_TAB = process.env.GOOGLE_JOBS_TAB ?? 'Jobs';
const CANDIDATES_TAB = process.env.GOOGLE_CANDIDATES_TAB ?? 'Candidates';

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
    .trim();                        // remove stray whitespace / \r\n at boundaries
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

// ── Jobs column mapping (A=0 … N=13) ────────────────────────────
// Row 1 of the "Jobs" sheet tab MUST contain these headers (paste verbatim):
//   ID | Title | Company | Location | Category | Type | SalaryMin | SalaryMax |
//   Currency | Description | Requirements | PostedAt | IsUrgent | IsFeatured
//
// Data rows start at row 2.  Requirements are pipe-separated: "3+ yrs React|BSc CS"
// IsUrgent / IsFeatured must be the text TRUE or FALSE (all caps).

// cache() deduplicates calls within a single server render (e.g., generateMetadata + page).
export const getJobs = cache(async function getJobs(): Promise<Job[]> {
  if (!isConfigured()) {
    console.warn('[sheets] getJobs: Google Sheets env vars not configured — returning empty list.');
    return [];
  }

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${JOBS_TAB}!A2:N`,
  });

  if (!data.values?.length) {
    console.warn(`[sheets] getJobs: No data rows found in ${JOBS_TAB}!A2:N — check that row 1 is a header row and data starts at row 2.`);
    return [];
  }

  return data.values
    .filter((row) => row[0] && row[1])   // skip fully-blank rows
    .map((row, i) => ({
      id:           row[0] || `job-${i}`,
      title:        row[1] || '',
      company:      row[2] || '',
      location:     row[3] || '',
      category:     (row[4] as Job['category']) || 'Other',
      type:         (row[5] as Job['type']) || 'Full-time',
      salaryMin:    Number(row[6]) || 0,
      salaryMax:    Number(row[7]) || 0,
      currency:     row[8] || 'MMK',
      description:  row[9] || '',
      requirements: row[10] ? String(row[10]).split('|').map((r: string) => r.trim()).filter(Boolean) : [],
      postedAt:     row[11] || new Date().toISOString(),
      isUrgent:     String(row[12]).toUpperCase() === 'TRUE',
      isFeatured:   String(row[13]).toUpperCase() === 'TRUE',
    }));
});

// ── Candidates column mapping (A=0 … J=9) ────────────────────────
// Row 1 of the "Candidates" sheet tab MUST contain these headers:
//   ID | Name | Phone | Position | CVUrl | LinkedInUrl | MatchScore | Stage | AppliedAt | Notes
//
// Stage must be one of: Applied | Shortlisted | Interview | Hired

export async function getCandidates(): Promise<Candidate[]> {
  if (!isConfigured()) {
    console.warn('[sheets] getCandidates: Google Sheets env vars not configured — returning empty list.');
    return [];
  }

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${CANDIDATES_TAB}!A2:J`,
  });

  if (!data.values?.length) return [];

  const VALID_STAGES = new Set(['Applied', 'Shortlisted', 'Interview', 'Hired']);

  return data.values
    .filter((row) => row[0] && row[1])
    .map((row, i) => ({
      id:          row[0] || `cand-${i}`,
      name:        row[1] || '',
      phone:       row[2] || '',
      position:    row[3] || '',
      cvUrl:       row[4] || undefined,
      linkedinUrl: row[5] || undefined,
      matchScore:  Number(row[6]) || 0,
      stage:       (VALID_STAGES.has(row[7]) ? row[7] : 'Applied') as ApplicationStatus,
      appliedAt:   row[8] || new Date().toISOString(),
      notes:       row[9] || undefined,
    }));
}

// ── appendJob ─────────────────────────────────────────────────────
// Appends a new row to the Jobs sheet and returns the generated job ID.
// Column order must match the getJobs() row mapping above (A=id … N=isFeatured).
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
  requirements: string[];   // stored as pipe-separated in col K
  isUrgent: boolean;
  isFeatured: boolean;
}): Promise<string> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const id       = `jb-${Date.now()}`;
  const postedAt = new Date().toISOString();
  const sheets   = getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${JOBS_TAB}!A:N`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        id,
        data.title,
        data.company,
        data.location,
        data.category,
        data.type,
        data.salaryMin,
        data.salaryMax,
        data.currency,
        data.description,
        data.requirements.join('|'),
        postedAt,
        data.isUrgent  ? 'TRUE' : 'FALSE',
        data.isFeatured ? 'TRUE' : 'FALSE',
      ]],
    },
  });

  return id;
}

// ── deleteJob ──────────────────────────────────────────────────────
// Finds the row by job ID and deletes it from the Jobs sheet.
export async function deleteJob(jobId: string): Promise<void> {
  if (!isConfigured()) throw new Error('Google Sheets not configured.');

  const sheets        = getSheets();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID!;

  // Get the numeric sheetId for the Jobs tab (required by batchUpdate deleteDimension)
  const meta  = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === JOBS_TAB);
  if (sheet?.properties?.sheetId === undefined) {
    throw new Error(`Sheet tab "${JOBS_TAB}" not found`);
  }
  const numericSheetId = sheet.properties.sheetId;

  // Find which row holds this job ID (column A, data starts at row 2)
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${JOBS_TAB}!A2:A`,
  });
  const rowIndex = data.values?.findIndex((row) => row[0] === jobId) ?? -1;
  if (rowIndex === -1) throw new Error(`Job "${jobId}" not found in sheet`);

  // Delete the row (startIndex is 0-based; row 0 = header, so data row 0 → startIndex 1)
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

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${CANDIDATES_TAB}!H${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[stage]] },
  });
}
