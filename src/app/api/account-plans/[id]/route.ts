import { requireTabAccess } from '@/lib/auth';
import { updateAccountPlanPrice } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('billing', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { priceMmk?: number };

  if (
    typeof body.priceMmk !== 'number' || !Number.isFinite(body.priceMmk) ||
    body.priceMmk < 0 || body.priceMmk > 100_000_000
  ) {
    return Response.json({ error: 'priceMmk must be a number between 0 and 100,000,000.' }, { status: 422 });
  }

  try {
    await updateAccountPlanPrice(id, body.priceMmk);
    await logAudit({ action: 'update', domain: 'billing', entityType: 'account_plan', entityId: id });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
