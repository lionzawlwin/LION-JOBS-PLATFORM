import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { appendB2bLead } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';

// 3 submissions per IP per 10 minutes — a real employer submits once,
// maybe retries once; this is generous while blocking scripted floods
// against a fully public, unauthenticated write endpoint.
const RATE_LIMIT_WINDOW_S = 600;
const RATE_LIMIT_MAX      = 3;

const leadSchema = z.object({
  companyName:    z.string().trim().min(1).max(200),
  industry:       z.string().trim().min(1).max(100),
  location:       z.string().trim().min(1).max(150),
  website:        z.string().trim().max(500).optional(),
  contactName:    z.string().trim().min(1).max(150),
  contactTitle:   z.string().trim().max(150).optional(),
  workEmail:      z.string().trim().email(),
  phone:          z.string().trim().min(7).max(30),
  jobTitle:       z.string().trim().min(1).max(200),
  headcount:      z.string().trim().max(20).optional(),
  workSetup:      z.string().trim().max(50).optional(),
  salaryBudget:   z.string().trim().max(100).optional(),
  urgency:        z.string().trim().max(100).optional(),
  requirements:   z.string().trim().max(5000).optional(),
  agencyMessage:  z.string().trim().max(5000).optional(),
  jobDescription: z.string().trim().max(5000).optional(),
  benefits:       z.string().trim().max(5000).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`employers-request:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait a few minutes and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(rl.resetIn),
          'X-RateLimit-Limit':     String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') },
      { status: 422 },
    );
  }

  const body = parsed.data;
  const leadData = {
    companyName:    body.companyName,
    industry:       body.industry,
    location:       body.location,
    website:        body.website        ?? '',
    contactName:    body.contactName,
    contactTitle:   body.contactTitle   ?? '',
    workEmail:      body.workEmail,
    phone:          body.phone,
    jobTitle:       body.jobTitle,
    headcount:      body.headcount      ?? '1',
    workSetup:      body.workSetup      ?? 'On-site',
    salaryBudget:   body.salaryBudget   ?? '',
    urgency:        body.urgency        ?? 'Within 1 month',
    requirements:   body.requirements   ?? '',
    agencyMessage:  body.agencyMessage  ?? '',
    jobDescription: body.jobDescription ?? '',
    benefits:       body.benefits       ?? '',
  };

  let leadId: string;
  try {
    leadId = await appendB2bLead(leadData);
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/employers/request', message: 'DB error saving lead', error: err });
    return NextResponse.json({ error: 'Failed to save lead. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, leadId });
}
