import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireRole, requireTabAccess } from '@/lib/auth';
import {
  ALL_TAB_DOMAINS,
  getEffectiveMatrix,
  isLockedOutByChange,
  LOCKOUT_GUARDRAIL_MESSAGE,
  type TabDomain,
  type AccessLevel,
} from '@/lib/permissions';
import { updateRolePermission, listRecentPermissionChanges } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import type { StaffRole } from '@/types';

const ALL_ROLES: StaffRole[] = ['owner', 'admin', 'cse', 'viewer'];
const ALL_LEVELS: AccessLevel[] = ['none', 'view', 'manage'];

// RBAC Step 3 of 3 (Layer 6, Dynamic RBAC). See
// docs/superpowers/specs/2026-07-06-layer6-dynamic-rbac-design.md.
//
// GET is view-level (owner or admin, matching the existing Team & Access
// tab gating) so both can see the grid; PATCH is owner-only (requireRole,
// not requireTabAccess -- narrower than any existing tab permission,
// matching "owner only, not admin" for changing who can change
// permissions).
export async function GET() {
  if (!(await requireTabAccess('team', 'view'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [matrix, changes] = await Promise.all([
    getEffectiveMatrix(),
    listRecentPermissionChanges(20),
  ]);

  return NextResponse.json({ matrix, changes }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireRole(['owner']))) {
    return NextResponse.json({ error: 'Only Owner can change permissions.' }, { status: 403 });
  }

  let body: { role?: string; tabDomain?: string; accessLevel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { role, tabDomain, accessLevel } = body;
  if (
    !role || !tabDomain || !accessLevel ||
    !ALL_ROLES.includes(role as StaffRole) ||
    !ALL_TAB_DOMAINS.includes(tabDomain as TabDomain) ||
    !ALL_LEVELS.includes(accessLevel as AccessLevel)
  ) {
    return NextResponse.json(
      { error: 'role, tabDomain, and a valid accessLevel are required.' },
      { status: 422 },
    );
  }

  if (isLockedOutByChange(role as StaffRole, tabDomain as TabDomain, accessLevel as AccessLevel)) {
    return NextResponse.json({ error: LOCKOUT_GUARDRAIL_MESSAGE }, { status: 422 });
  }

  const session = await getServerSession(authOptions);
  const changedBy = session?.user?.email ?? 'unknown';

  try {
    const { oldAccessLevel } = await updateRolePermission({ role, tabDomain, accessLevel, changedBy });
    await logAudit({
      action: 'update',
      domain: 'role-permissions',
      entityType: 'role_permission',
      entityId: `${role}:${tabDomain}`,
    });
    revalidateTag('role-permissions', { expire: 0 });
    return NextResponse.json({ role, tabDomain, accessLevel, oldAccessLevel });
  } catch {
    return NextResponse.json({ error: 'Could not update permission.' }, { status: 502 });
  }
}
