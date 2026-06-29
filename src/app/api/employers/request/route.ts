import { NextRequest, NextResponse } from 'next/server';
import { appendB2bLead } from '@/lib/sheets';

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
    companyName:  body.companyName  ?? '',
    industry:     body.industry     ?? '',
    location:     body.location     ?? '',
    website:      body.website      ?? '',
    contactName:  body.contactName  ?? '',
    contactTitle: body.contactTitle ?? '',
    workEmail:    body.workEmail    ?? '',
    phone:        body.phone        ?? '',
    jobTitle:     body.jobTitle     ?? '',
    headcount:    body.headcount    ?? '1',
    workSetup:    body.workSetup    ?? 'On-site',
    salaryBudget: body.salaryBudget ?? '',
    urgency:      body.urgency      ?? 'Within 1 month',
    requirements: body.requirements ?? '',
  };

  let leadId: string;
  try {
    leadId = await appendB2bLead(leadData);
  } catch (err) {
    console.error('[employers/request] Sheets error:', err);
    return NextResponse.json({ error: 'Failed to save lead. Please try again.' }, { status: 502 });
  }

  // Fire Make.com Telegram alert (non-blocking)
  const webhookUrl = process.env.MAKE_EMPLOYER_WEBHOOK_URL ?? process.env.MAKE_WEBHOOK_URL;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type:        'employer_lead',
        leadId,
        companyName: leadData.companyName,
        contactName: leadData.contactName,
        workEmail:   leadData.workEmail,
        phone:       leadData.phone,
        jobTitle:    leadData.jobTitle,
        headcount:   leadData.headcount,
        urgency:     leadData.urgency,
        location:    leadData.location,
        industry:    leadData.industry,
      }),
      signal: AbortSignal.timeout(8_000),
    }).catch((e) => console.warn('[employers/request] webhook error:', e));
  }

  return NextResponse.json({ ok: true, leadId });
}
