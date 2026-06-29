import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== 'string') {
    return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
  }

  const MAKE_URL = process.env.MAKE_PUBLISH_WEBHOOK_URL;
  if (!MAKE_URL) {
    return NextResponse.json(
      { ok: true, dev: true, message: 'MAKE_PUBLISH_WEBHOOK_URL not configured — post not sent.' },
    );
  }

  try {
    const res = await fetch(MAKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text:     body.text,
        platform: body.platform ?? 'facebook',
        postType: body.postType ?? 'custom',
        tone:     body.tone     ?? 'professional',
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Make.com returned ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[content/distribute]', err);
    return NextResponse.json({ error: 'Failed to reach Make.com' }, { status: 502 });
  }
}
