import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireStaff } from '@/lib/auth';
import { hasAccess } from '@/lib/permissions';
import { listPendingJobRequests, listSystemEvents, getB2bLeads, getContracts } from '@/lib/db';
import { buildNotifications } from '@/lib/notifications';
import type { JobRequest, SystemEvent, B2bLead, Contract, StaffRole } from '@/types';

// Per-item-type RBAC: only fetch a domain's data if the caller can view that
// tab, reusing the same single-source-of-truth matrix every other route
// uses (see src/lib/permissions.ts). No new permission concept.
export async function GET() {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role as StaffRole;

  const [canManageJobs, canSystemHealth, canB2bLeads, canEnterprise] = await Promise.all([
    hasAccess(role, 'manage-jobs', 'view'),
    hasAccess(role, 'system-health', 'view'),
    hasAccess(role, 'b2b-leads', 'view'),
    hasAccess(role, 'enterprise', 'view'),
  ]);

  const [jobRequests, systemEvents, leads, contracts]: [JobRequest[], SystemEvent[], B2bLead[], Contract[]] =
    await Promise.all([
      canManageJobs ? listPendingJobRequests() : Promise.resolve([]),
      canSystemHealth ? listSystemEvents({ resolved: 'unresolved', days: 7 }) : Promise.resolve([]),
      canB2bLeads ? getB2bLeads() : Promise.resolve([]),
      canEnterprise ? getContracts() : Promise.resolve([]),
    ]);

  const items = buildNotifications({ jobRequests, systemEvents, leads, contracts, now: new Date() });

  return Response.json({ items, totalCount: items.length }, { headers: { 'Cache-Control': 'no-store' } });
}
