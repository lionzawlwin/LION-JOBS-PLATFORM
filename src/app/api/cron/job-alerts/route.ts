import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/db';
import { logFailure, logCronSuccess } from '@/lib/observability';
import { runHealthCheck } from '@/lib/healthCheck';
import { runCrmDigest } from '@/lib/crmAlerts';
import { runJobAlertDigest } from '@/lib/jobAlertDigest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';
const ROUTE = '/api/cron/job-alerts';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await runHealthCheck();
    await runCrmDigest();
    // Job Alert Subscriptions (Item #2, CTO big-upgrades roadmap):
    // piggybacked onto this same daily invocation rather than a new cron
    // job, same reasoning as the two calls above (Vercel Hobby-plan
    // 2-cron-job cap).
    await runJobAlertDigest();

    const jobs = await getJobs();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const newJobs = jobs.filter((job) => {
      if (!job.postedAt) return false;
      try {
        return new Date(job.postedAt) >= since;
      } catch {
        return false;
      }
    });

    if (newJobs.length === 0) {
      await logCronSuccess(ROUTE, 'No new jobs in last 24 hours');
      return NextResponse.json({ ok: true, sent: 0, message: 'No new jobs in last 24 hours' });
    }

    const botToken  = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      await logCronSuccess(ROUTE, 'Telegram not configured, skipped');
      return NextResponse.json({ ok: true, sent: 0, message: 'Telegram not configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID' });
    }

    const preview = newJobs.slice(0, 5);
    const more    = newJobs.length > 5 ? `\n\n…and ${newJobs.length - 5} more roles` : '';

    const lines = preview.map(
      (job) =>
        `▶️ *${escapeMarkdown(job.title)}*\n   ${escapeMarkdown(job.company)} · ${escapeMarkdown(job.location)}\n   ${SITE_URL}/apply/${job.id}`,
    );

    const message =
      `🦁 *Lion Jobs — Daily Digest*\n\n` +
      `${newJobs.length} new ${newJobs.length === 1 ? 'role' : 'roles'} posted today!\n\n` +
      lines.join('\n\n') +
      more +
      `\n\n[Browse all jobs](${SITE_URL})`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      },
    );

    const tgData: unknown = await tgRes.json();
    const tgOk = (tgData as { ok?: boolean }).ok ?? false;

    if (!tgOk) {
      await logFailure({
        category: 'cron',
        route:    ROUTE,
        message:  'Telegram sendMessage returned ok:false',
        context:  { sentCount: newJobs.length, telegramStatus: tgRes.status },
      });
    } else {
      await logCronSuccess(ROUTE, `Sent ${newJobs.length} new jobs`);
    }

    return NextResponse.json({ ok: true, sent: newJobs.length, telegram: tgOk });
  } catch (err) {
    await logFailure({ category: 'cron', route: ROUTE, message: (err as Error).message, error: err });
    return NextResponse.json({ error: 'job-alerts cron failed' }, { status: 502 });
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()])/g, '\\$1');
}
