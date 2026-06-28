import { google } from 'googleapis';
import type { Job, Candidate, ApplicationStatus } from '@/types';

function getSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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

const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? '';

export async function getJobs(): Promise<Job[]> {
  if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not configured.');

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Jobs!A2:N',
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
  if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not configured.');

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Candidates!A2:J',
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
  if (!SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not configured.');

  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Candidates!A2:A',
  });

  if (!data.values) return;

  const rowIndex = data.values.findIndex((row) => row[0] === candidateId);
  if (rowIndex === -1) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Candidates!H${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[stage]] },
  });
}
