import { requireTabAccess } from '@/lib/auth';

interface IntegrationStatus {
  name: string;
  configured: boolean;
  optional: boolean;
  detail: string;
}

// Boolean presence checks only — never expose actual secret values to the
// client. Mirrors this repo's existing pattern (e.g. POST /api/jobs's
// `if (!ADMIN_KEY) return { error: 'ADMIN_KEY is not configured...' }`).
export async function GET() {
  if (!(await requireTabAccess('system-health', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const integrations: IntegrationStatus[] = [
    {
      name: 'Google Drive (CV storage)',
      configured: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        && !!process.env.GOOGLE_PRIVATE_KEY
        && !!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
      optional: false,
      detail: 'GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_PARENT_FOLDER_ID',
    },
    {
      name: 'Resend (transactional email)',
      configured: !!process.env.RESEND_API_KEY,
      optional: false,
      detail: 'RESEND_API_KEY',
    },
    {
      name: 'Social publish webhook',
      configured: !!process.env.PUBLISH_WEBHOOK_SECRET
        && !!process.env.GITHUB_ACTIONS_TOKEN
        && !!process.env.GITHUB_REPO,
      optional: false,
      detail: 'PUBLISH_WEBHOOK_SECRET, GITHUB_ACTIONS_TOKEN, GITHUB_REPO',
    },
    {
      name: 'Sentry (error tracking)',
      configured: !!process.env.SENTRY_DSN,
      optional: true,
      detail: 'SENTRY_DSN — optional, unset = no-op',
    },
    {
      name: 'Health-check alert email',
      configured: !!process.env.ALERT_EMAIL,
      optional: true,
      detail: 'ALERT_EMAIL — optional, unset = check silently no-ops',
    },
  ];

  return Response.json({ integrations }, { headers: { 'Cache-Control': 'no-store' } });
}
