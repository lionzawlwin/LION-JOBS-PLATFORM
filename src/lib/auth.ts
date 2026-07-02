import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import type { StaffRole } from '@/types';

// authOptions.ts's signIn callback already enforces authorization (the
// legacy ADMIN_EMAIL, or an active staff row) before a session can exist.
// Route handlers calling requireStaff() only need to confirm a session
// exists, not re-check identity — that gate already ran at login time.
export async function requireStaff(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return !!session?.user?.email;
}

// For routes that need to restrict beyond "any active staff member" — right
// now that's just /api/staff/* (managing the roster itself). Everything else
// still only checks requireStaff(), matching the single access tier every
// route had before this staff table existed; per-tab granular RBAC is a
// separate, not-yet-scoped follow-up.
export async function requireRole(roles: StaffRole[]): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  return !!role && roles.includes(role);
}
