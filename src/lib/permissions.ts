import type { StaffRole } from '@/types';
import { getCachedRolePermissions } from '@/lib/db/rolePermissions';

export type TabDomain =
  | 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies'
  | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal'
  | 'billing' | 'team' | 'system-health';

export type AccessLevel = 'none' | 'view' | 'manage';

const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, view: 1, manage: 2 };

// RBAC Step 2 of 3 (Layer 6, Dynamic RBAC — see
// docs/superpowers/specs/2026-07-06-layer6-dynamic-rbac-design.md):
// PERMISSIONS is no longer the sole source of truth -- the DB-backed
// role_permissions table is, editable via the Team & Access tab (Step 3).
// This constant is kept, unchanged, as the seed data (migration 0017) and
// as the fail-closed fallback below if the DB is ever unreachable. Original
// rationale for each cell: docs/superpowers/specs/2026-07-03-phase-4-rbac-design.md.
export const PERMISSIONS: Record<StaffRole, Record<TabDomain, AccessLevel>> = {
  owner: {
    overview: 'manage', candidates: 'manage', 'post-job': 'manage', 'manage-jobs': 'manage',
    companies: 'manage', enterprise: 'manage', 'b2b-leads': 'manage', content: 'manage',
    campaigns: 'manage', legal: 'manage', billing: 'manage', team: 'manage', 'system-health': 'manage',
  },
  admin: {
    overview: 'manage', candidates: 'manage', 'post-job': 'manage', 'manage-jobs': 'manage',
    companies: 'manage', enterprise: 'manage', 'b2b-leads': 'manage', content: 'manage',
    campaigns: 'manage', legal: 'manage', billing: 'manage', team: 'manage', 'system-health': 'manage',
  },
  cse: {
    overview: 'view', candidates: 'none', 'post-job': 'none', 'manage-jobs': 'none',
    companies: 'manage', enterprise: 'manage', 'b2b-leads': 'manage', content: 'none',
    campaigns: 'none', legal: 'view', billing: 'view', team: 'none', 'system-health': 'none',
  },
  viewer: {
    overview: 'view', candidates: 'view', 'post-job': 'none', 'manage-jobs': 'view',
    companies: 'view', enterprise: 'view', 'b2b-leads': 'view', content: 'view',
    campaigns: 'view', legal: 'view', billing: 'view', team: 'none', 'system-health': 'none',
  },
};

// Exported so server components (dashboard/page.tsx) can compute a
// signed-in role's visible-tab list without duplicating this literal.
export const ALL_TAB_DOMAINS = Object.keys(PERMISSIONS.owner) as TabDomain[];

function isTabDomain(value: string): value is TabDomain {
  return (ALL_TAB_DOMAINS as string[]).includes(value);
}

function isStaffRole(value: string): value is StaffRole {
  return value === 'owner' || value === 'admin' || value === 'cse' || value === 'viewer';
}

async function getEffectiveMatrix(): Promise<Record<StaffRole, Record<TabDomain, AccessLevel>>> {
  try {
    const rows = await getCachedRolePermissions();
    if (rows.length === 0) throw new Error('role_permissions returned no rows');

    // Start from PERMISSIONS as the base (every cell pre-populated), then
    // overlay live DB values. Guarantees a full 52-cell matrix even if the
    // DB is ever missing a row, and never grants more than the hardcoded
    // fallback would for any cell the DB doesn't have an answer for.
    const matrix: Record<StaffRole, Record<TabDomain, AccessLevel>> = {
      owner:  { ...PERMISSIONS.owner },
      admin:  { ...PERMISSIONS.admin },
      cse:    { ...PERMISSIONS.cse },
      viewer: { ...PERMISSIONS.viewer },
    };

    for (const row of rows) {
      if (!isStaffRole(row.role) || !isTabDomain(row.tabDomain)) continue;
      if (row.accessLevel !== 'none' && row.accessLevel !== 'view' && row.accessLevel !== 'manage') continue;
      matrix[row.role][row.tabDomain] = row.accessLevel;
    }

    return matrix;
  } catch {
    // Fail closed to the known-good hardcoded matrix -- never fail open.
    return PERMISSIONS;
  }
}

export async function getAccessLevel(role: StaffRole, domain: TabDomain): Promise<AccessLevel> {
  const matrix = await getEffectiveMatrix();
  return matrix[role][domain];
}

export async function hasAccess(role: StaffRole, domain: TabDomain, required: 'view' | 'manage'): Promise<boolean> {
  return LEVEL_RANK[await getAccessLevel(role, domain)] >= LEVEL_RANK[required];
}
