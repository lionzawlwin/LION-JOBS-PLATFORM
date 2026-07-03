import type { StaffRole } from '@/types';

export type TabDomain =
  | 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies'
  | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal'
  | 'billing' | 'team';

export type AccessLevel = 'none' | 'view' | 'manage';

const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, view: 1, manage: 2 };

// Single source of truth for Phase 4 RBAC. See
// docs/superpowers/specs/2026-07-03-phase-4-rbac-design.md for the full
// rationale behind each cell. Changing a role's access is a code change +
// deploy, not a runtime setting — deliberate, see spec's Non-goals.
export const PERMISSIONS: Record<StaffRole, Record<TabDomain, AccessLevel>> = {
  owner: {
    overview: 'manage', candidates: 'manage', 'post-job': 'manage', 'manage-jobs': 'manage',
    companies: 'manage', enterprise: 'manage', 'b2b-leads': 'manage', content: 'manage',
    campaigns: 'manage', legal: 'manage', billing: 'manage', team: 'manage',
  },
  admin: {
    overview: 'manage', candidates: 'manage', 'post-job': 'manage', 'manage-jobs': 'manage',
    companies: 'manage', enterprise: 'manage', 'b2b-leads': 'manage', content: 'manage',
    campaigns: 'manage', legal: 'manage', billing: 'manage', team: 'manage',
  },
  cse: {
    overview: 'view', candidates: 'none', 'post-job': 'none', 'manage-jobs': 'none',
    companies: 'manage', enterprise: 'manage', 'b2b-leads': 'manage', content: 'none',
    campaigns: 'none', legal: 'view', billing: 'view', team: 'none',
  },
  viewer: {
    overview: 'view', candidates: 'view', 'post-job': 'none', 'manage-jobs': 'view',
    companies: 'view', enterprise: 'view', 'b2b-leads': 'view', content: 'view',
    campaigns: 'view', legal: 'view', billing: 'view', team: 'none',
  },
};

export function getAccessLevel(role: StaffRole, domain: TabDomain): AccessLevel {
  return PERMISSIONS[role][domain];
}

export function hasAccess(role: StaffRole, domain: TabDomain, required: 'view' | 'manage'): boolean {
  return LEVEL_RANK[getAccessLevel(role, domain)] >= LEVEL_RANK[required];
}
