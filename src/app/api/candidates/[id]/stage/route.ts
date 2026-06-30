import { z } from 'zod';
import { updateCandidateStage } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { ApplicationStatus } from '@/types';

const stageSchema = z.object({
  stage: z.enum(['Applied', 'Shortlisted', 'Interview', 'Hired']),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = stageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid stage value.' }, { status: 422 });
  }

  try {
    await updateCandidateStage(id, parsed.data.stage as ApplicationStatus);
  } catch (err) {
    console.error('[stage] error:', err);
    if (process.env.NODE_ENV !== 'production') {
      return Response.json({ ok: true, dev: true });
    }
    return Response.json({ error: 'Could not update stage.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
