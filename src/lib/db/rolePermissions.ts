import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

// RBAC Step 2 of 3 (Layer 6, Dynamic RBAC). See
// docs/superpowers/specs/2026-07-06-layer6-dynamic-rbac-design.md.
//
// Pure data accessor, like every other file in src/lib/db/ -- deliberately
// does not import from src/lib/permissions.ts (which imports this module),
// to avoid a circular dependency. The merge-with-hardcoded-fallback logic
// lives in permissions.ts, not here.
export interface RolePermissionRow {
  role: string;
  tabDomain: string;
  accessLevel: string;
}

async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.from('role_permissions').select('role, tab_domain, access_level');
  if (error) throw new Error(`[db/rolePermissions] fetchRolePermissions error: ${error.message}`);
  return (data ?? []).map((row) => ({
    role: row.role as string,
    tabDomain: row.tab_domain as string,
    accessLevel: row.access_level as string,
  }));
}

// Same unstable_cache posture as enterpriseStats.ts's getEnterpriseStats:
// Vercel's built-in Data Cache, not the newer `use cache` directive (needs
// a paid external cache handler for reliable cross-request persistence on
// this app's serverless deployment). 30s revalidate as a safety net; every
// write to role_permissions calls
// revalidateTag('role-permissions', { expire: 0 }) so an edit takes effect
// immediately rather than waiting out the window.
export const getCachedRolePermissions = unstable_cache(
  fetchRolePermissions,
  ['role-permissions'],
  { revalidate: 30, tags: ['role-permissions'] },
);
