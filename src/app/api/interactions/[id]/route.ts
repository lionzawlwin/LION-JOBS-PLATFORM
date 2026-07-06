import { revalidateTag } from 'next/cache';
import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { deleteInteraction, getInteractionCompanyId, getContracts } from '@/lib/db';
import { deriveActiveCseByCompany } from '@/lib/cseScope';
import { logAudit } from '@/lib/audit';
import type { NextRequest } from 'next/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('enterprise', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;

  // Layer 24 (AppSec review): same write-side gap as contracts/companies --
  // no ownership check meant a cse-role session could delete any
  // interaction by id, not just ones logged against their own companies.
  const scope = await getSessionScope();
  if (scope?.role === 'cse') {
    const companyId = await getInteractionCompanyId(id);
    if (companyId) {
      const contracts = await getContracts();
      const owner = deriveActiveCseByCompany(contracts).get(companyId);
      if (!owner || owner !== scope.cseRepId) {
        return Response.json({ error: 'Unauthorised' }, { status: 401 });
      }
    }
  }

  try {
    await deleteInteraction(id);
    await logAudit({ action: 'delete', domain: 'enterprise', entityType: 'interaction', entityId: id });
    revalidateTag('client-health', { expire: 0 });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
