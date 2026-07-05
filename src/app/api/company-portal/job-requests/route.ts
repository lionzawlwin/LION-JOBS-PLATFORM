import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { appendJobRequest, listJobRequestsForCompany } from '@/lib/db';
import { logFailure } from '@/lib/observability';

const CATEGORIES = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'Finance',
  'Operations', 'Customer Service', 'Healthcare', 'Education', 'Other',
] as const;
const TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'] as const;

const schema = z.object({
  title:        z.string().trim().min(2).max(200),
  location:     z.string().trim().min(2).max(200),
  category:     z.enum(CATEGORIES),
  type:         z.enum(TYPES),
  salaryMin:    z.number().min(0).max(1_000_000_000),
  salaryMax:    z.number().min(0).max(1_000_000_000),
  currency:     z.string().trim().min(1).max(10),
  description:  z.string().trim().min(20).max(10_000),
  requirements: z.array(z.string().trim().max(200)).max(50),
});

export async function GET() {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const requests = await listJobRequestsForCompany(companyId);
  return NextResponse.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => null);
  if (!rawBody) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid job request details.' }, { status: 422 });
  }

  try {
    const id = await appendJobRequest({ companyId, ...parsed.data });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/company-portal/job-requests', message: 'Failed to save job request', error: err });
    return NextResponse.json({ error: 'Failed to submit job request.' }, { status: 502 });
  }
}
