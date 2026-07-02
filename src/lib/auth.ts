import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import type { StaffRole } from '@/types';
import { hasAccess, type TabDomain } from '@/lib/permissions';

// authOptions.ts's signIn callback already enforces authorization (the
// legacy ADMIN_EMAIL, or an active staff row) before a session can exist.
// Route handlers calling requireStaff() only need to confirm a session
// exists, not re-check identity — that gate already ran at login time.
export async function requireStaff(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.user?.email;
}

// For routes that need to restrict beyond "any active staff member" — right
// now that's just /api/staff/* (managing the roster itself).
export async function requireRole(roles: StaffRole[]): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  return !!role && roles.includes(role);
}

// Phase 4: per-tab/per-action RBAC. `domain` is a dashboard tab (see
// src/lib/permissions.ts), `level` is the minimum access the caller needs
// ('view' for read routes, 'manage' for mutating ones). See
// docs/superpowers/specs/2026-07-03-phase-4-rbac-design.md.
export async function requireTabAccess(domain: TabDomain, level: 'view' | 'manage'): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  return !!role && hasAccess(role, domain, level);
}
