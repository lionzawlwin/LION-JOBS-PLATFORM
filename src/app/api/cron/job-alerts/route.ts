import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/sheets';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

export async function GET(req: Request) {
  // Vercel Cron authenticates with Bearer + CRON_SECRET
  const authHeader = req.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    return NextResponse.json({ ok: true, sent: 0, message: 'No new jobs in last 24 hours' });
  }

  const botToken  = process.env.TELEGRAM_BOT_TOKEN;
  const channelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!botToken || !channelId) {
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

  return NextResponse.json({
    ok: true,
    sent: newJobs.length,
    telegram: (tgData as { ok?: boolean }).ok ?? false,
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()])/g, '\\$1');
}
