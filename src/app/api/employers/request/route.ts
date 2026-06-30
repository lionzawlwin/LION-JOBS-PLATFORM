import { NextRequest, NextResponse } from 'next/server';
import { appendB2bLead } from '@/lib/db';

export async function POST(req: NextRequest) {
  let body: Record<string, string>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const required = ['companyName', 'industry', 'location', 'contactName', 'workEmail', 'phone', 'jobTitle'];
  const missing  = required.filter((k) => !body[k]?.trim());
  if (missing.length) {
    return NextResponse.json({ error: `Missing fields: ${missing.join(', ')}` }, { status: 422 });
  }

  const leadData = {
    companyName:    body.companyName    ?? '',
    industry:       body.industry       ?? '',
    location:       body.location       ?? '',
    website:        body.website        ?? '',
    contactName:    body.contactName    ?? '',
    contactTitle:   body.contactTitle   ?? '',
    workEmail:      body.workEmail      ?? '',
    phone:          body.phone          ?? '',
    jobTitle:       body.jobTitle       ?? '',
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
    console.error('[employers/request] DB error:', err);
    return NextResponse.json({ error: 'Failed to save lead. Please try again.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, leadId });
}
