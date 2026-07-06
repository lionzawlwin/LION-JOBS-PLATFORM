import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCompanyById, getPlanUsage, appendSystemEvent } from '@/lib/db';

// Layer 15 (Self-serve job slot request) -- SCAFFOLD ONLY. No payment rail
// is wired up: Stripe vs. manual-invoice upgrade is a business decision for
// the repo owner, not something to default into. This just gets the
// request in front of staff (via System Health's system_events feed,
// category 'other') instead of the company having to email a CSE directly.
// Revisit once a payment-rail decision is made -- see roadmap Layer 15.
export async function POST() {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    return NextResponse.json({ error: 'Company not found.' }, { status: 404 });
  }

  const usage = await getPlanUsage(companyId, company.planId);

  await appendSystemEvent({
    category: 'other',
    level:    'info',
    route:    '/api/company-portal/plan-upgrade-request',
    message:  `${company.name} requested more job slots / a plan upgrade`,
    context: {
      companyId,
      companyName:  company.name,
      currentPlan:  usage.plan?.name ?? 'none',
      jobSlotsUsed: usage.jobSlotsUsed,
      jobSlotLimit: usage.plan?.jobSlotLimit ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
