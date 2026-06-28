import { google } from 'googleapis';
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

export async function getJobs(): Promise<Job[]> {
  if (!isConfigured()) return [];

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${JOBS_TAB}!A2:N`,
  });

  if (!data.values?.length) return [];

  return data.values.map((row, i) => ({
    id: row[0] || `job-${i}`,
    title: row[1] || '',
    company: row[2] || '',
    location: row[3] || '',
    category: (row[4] as Job['category']) || 'Other',
    type: (row[5] as Job['type']) || 'Full-time',
    salaryMin: Number(row[6]) || 0,
    salaryMax: Number(row[7]) || 0,
    currency: row[8] || 'USD',
    description: row[9] || '',
    requirements: row[10] ? row[10].split('|') : [],
    postedAt: row[11] || new Date().toISOString(),
    isUrgent: row[12] === 'TRUE',
    isFeatured: row[13] === 'TRUE',
  }));
}

export async function getCandidates(): Promise<Candidate[]> {
  if (!isConfigured()) return [];

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: `${CANDIDATES_TAB}!A2:J`,
  });

  if (!data.values?.length) return [];

  return data.values.map((row, i) => ({
    id: row[0] || `cand-${i}`,
    name: row[1] || '',
    phone: row[2] || '',
    position: row[3] || '',
    cvUrl: row[4] || undefined,
    linkedinUrl: row[5] || undefined,
    matchScore: Number(row[6]) || 0,
    stage: (row[7] as ApplicationStatus) || 'Applied',
    appliedAt: row[8] || new Date().toISOString(),
    notes: row[9] || undefined,
  }));
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
