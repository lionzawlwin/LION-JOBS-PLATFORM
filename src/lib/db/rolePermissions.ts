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

// RBAC Step 3 of 3: write path. Calls the set_role_permission Postgres
// function (migration 0018) so the upsert and its audit row land in one
// transaction -- never separately, even if the process crashes between
// them. Caller (the /api/role-permissions route) is responsible for
// validating role/tabDomain/accessLevel and the lockout guardrail before
// calling this -- this function trusts its inputs, matching every other
// db/*.ts accessor's contract in this app.
export async function updateRolePermission(params: {
  role: string;
  tabDomain: string;
  accessLevel: string;
  changedBy: string;
}): Promise<{ oldAccessLevel: string }> {
  const changeId = `pc-${Date.now()}`;
  const { data, error } = await supabase.rpc('set_role_permission', {
    p_role: params.role,
    p_tab_domain: params.tabDomain,
    p_access_level: params.accessLevel,
    p_changed_by: params.changedBy,
    p_change_id: changeId,
  });
  if (error) throw new Error(`Failed to update role permission: ${error.message}`);
  return { oldAccessLevel: data as string };
}

export interface PermissionChangeRow {
  id: string;
  role: string;
  tabDomain: string;
  oldAccessLevel: string;
  newAccessLevel: string;
  changedBy: string;
  changedAt: string;
}

export async function listRecentPermissionChanges(limit = 20): Promise<PermissionChangeRow[]> {
  const { data, error } = await supabase
    .from('permission_changes')
    .select('id, role, tab_domain, old_access_level, new_access_level, changed_by, changed_at')
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[db/rolePermissions] listRecentPermissionChanges error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as string,
    tabDomain: row.tab_domain as string,
    oldAccessLevel: row.old_access_level as string,
    newAccessLevel: row.new_access_level as string,
    changedBy: row.changed_by as string,
    changedAt: row.changed_at as string,
  }));
}
