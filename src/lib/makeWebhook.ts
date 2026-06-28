import type { ApplicationPayload } from '@/types';

export async function forwardToMake(payload: ApplicationPayload): Promise<void> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!webhookUrl) throw new Error('MAKE_WEBHOOK_URL is not configured');

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Make.com webhook returned ${res.status}: ${await res.text()}`);
  }
}
