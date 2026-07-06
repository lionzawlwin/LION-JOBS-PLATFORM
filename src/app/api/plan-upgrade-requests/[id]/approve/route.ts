import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { getAccountPlans, updateCompanyPlan, createPlanUpgradeInvoice, resolveSystemEvent } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { logFailure } from '@/lib/observability';
import type { NextRequest } from 'next/server';

// POST /api/plan-upgrade-requests/[id]/approve
// Body: { companyId: string, companyName: string, planId: string }
// One action: assigns the chosen plan to the company, creates a Draft
// invoice for its price (createPlanUpgradeInvoice -- separate from the
// candidate-placement invoice flow), and clears the request from the
// inbox. planId is resolved server-side against account_plans, never
// trusting a client-supplied price.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { companyId, companyName, planId } = body as Record<string, unknown>;
  if (typeof companyId !== 'string' || typeof companyName !== 'string' || typeof planId !== 'string') {
    return Response.json({ error: 'companyId, companyName, and planId are required.' }, { status: 422 });
  }

  const plans = await getAccountPlans();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    return Response.json({ error: 'Plan not found.' }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  const resolvedBy = session?.user?.email;
  if (!resolvedBy) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await updateCompanyPlan(companyId, planId);

    const invoice = await createPlanUpgradeInvoice({
      companyId,
      companyName,
      planName: plan.name,
      priceMmk: plan.priceMmk ?? 0,
    });

    await resolveSystemEvent(id, resolvedBy);
    await logAudit({ action: 'update', domain: 'billing', entityType: 'plan_upgrade_request', entityId: id });

    return Response.json({ ok: true, invoice });
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/plan-upgrade-requests/[id]/approve',
      message:  'Could not approve plan upgrade request',
      error:    err,
      context:  { requestId: id, companyId, planId },
    });
    return Response.json({ error: 'Could not approve this request.' }, { status: 502 });
  }
}
