import { NextResponse } from 'next/server';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { getCompanyById, getPlanUsage, appendSystemEvent } from '@/lib/db';

// Layer 15 (Self-serve job slot request). No payment rail is wired up:
// Stripe vs. manual-invoice upgrade is a business decision for the repo
// owner, not something to default into. Batch 2 (Plan Upgrade Request
// Inbox) made this request actually actionable -- category 'plan_upgrade'
// (not 'other') so listPlanUpgradeRequests() can query it directly, surfaced
// in the Billing tab instead of nowhere (it used to log at level='info'
// under 'other', which System Health's error feed can't show regardless of
// category -- it hard-filters level='error').
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
    category: 'plan_upgrade',
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
