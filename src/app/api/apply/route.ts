import { z } from 'zod';
import { forwardToMake } from '@/lib/makeWebhook';
import type { NextRequest } from 'next/server';

const applySchema = z
  .object({
    fullName: z.string().min(2),
    phone: z.string().min(7),
    position: z.string().min(2),
    jobId: z.string().optional(),
    mode: z.enum(['cv', 'linkedin']),
    cvBase64: z.string().optional(),
    cvFileName: z.string().optional(),
    linkedinUrl: z.string().url().optional(),
  })
  .refine(
    (d) =>
      d.mode === 'cv'
        ? Boolean(d.cvBase64 && d.cvFileName)
        : Boolean(d.linkedinUrl),
    { message: 'Provide either a CV or a LinkedIn URL.' },
  );

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Validation failed.';
    return Response.json({ error: message }, { status: 422 });
  }

  const { fullName, phone, position, jobId, cvBase64, cvFileName, linkedinUrl } = parsed.data;

  try {
    await forwardToMake({ fullName, phone, position, jobId, cvBase64, cvFileName, linkedinUrl });
  } catch (err) {
    // Log server-side but don't leak internals to client
    console.error('[apply] Make.com webhook error:', err);
    // If Make.com is not yet configured, treat it as success in dev
    if (process.env.NODE_ENV !== 'production') {
      return Response.json({ ok: true, dev: true });
    }
    return Response.json(
      { error: 'Could not submit your application right now. Please try again later.' },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
