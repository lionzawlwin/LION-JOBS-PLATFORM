import { google } from 'googleapis';
import { Readable } from 'stream';

function parsePrivateKey(raw: string): string {
  return raw
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();
}

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY
    ? parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY)
    : undefined;

  if (!email || !key) {
    throw new Error('Missing Google credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).');
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Creates a sub-folder inside `parentFolderId` and returns its Drive ID.
 */
export async function createCandidateFolder(
  candidateName: string,
  parentFolderId: string,
): Promise<string> {
  const drive = getDriveClient();

  const res = await drive.files.create({
    requestBody: {
      name:     candidateName,
      mimeType: 'application/vnd.google-apps.folder',
      parents:  [parentFolderId],
    },
    fields: 'id',
  });

  const folderId = res.data.id;
  if (!folderId) throw new Error('Drive did not return a folder ID.');
  return folderId;
}

export interface DriveFile {
  name:     string;
  base64:   string;
  mimeType?: string;
}

/**
 * Uploads one file into the specified Drive folder.
 * Returns the shareable web-view link.
 */
export async function uploadFileToDrive(
  file:     DriveFile,
  folderId: string,
): Promise<string> {
  const drive = getDriveClient();

  const buffer  = Buffer.from(file.base64, 'base64');
  const stream  = Readable.from(buffer);
  const guessedMime = file.mimeType ?? guessMime(file.name);

  const res = await drive.files.create({
    requestBody: {
      name:    file.name,
      parents: [folderId],
    },
    media: {
      mimeType: guessedMime,
      body:     stream,
    },
    fields: 'id,webViewLink',
  });

  // No public permission is set — file is accessible only to users who have
  // access to the parent folder (your team's Drive). This keeps candidate CVs
  // private to your organisation.
  return res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view`;
}

function guessMime(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf:  'application/pdf',
    doc:  'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png:  'image/png',
    jpg:  'image/jpeg',
    jpeg: 'image/jpeg',
  };
  return map[ext] ?? 'application/octet-stream';
}
