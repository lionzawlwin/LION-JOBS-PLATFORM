/**
 * Layer 2 of Module #1 (Enterprise Employer Console / multi-seat company
 * accounts). Mirrors src/lib/permissions.ts's (role x domain) -> access
 * level pattern, scoped to Company Portal seats instead of staff roles.
 *
 * v1 is a hardcoded matrix only -- unlike the staff side's Layer 6
 * DB-backed dynamic RBAC, there's no owner-editable-per-cell requirement
 * here yet. Add a DB-backed layer later only if a real need for
 * per-company-customized seat permissions actually emerges.
 */

export type PortalSeatRole = 'owner' | 'hiring_manager' | 'viewer';

export type PortalActionDomain =
  | 'job-requests' | 'applicants' | 'contact-unlock' | 'billing' | 'team';

export type PortalAccessLevel = 'none' | 'view' | 'manage';

const LEVEL_RANK: Record<PortalAccessLevel, number> = { none: 0, view: 1, manage: 2 };

export const PORTAL_PERMISSIONS: Record<PortalSeatRole, Record<PortalActionDomain, PortalAccessLevel>> = {
  owner: {
    'job-requests': 'manage',
    applicants: 'manage',
    'contact-unlock': 'manage',
    billing: 'manage',
    team: 'manage',
  },
  hiring_manager: {
    'job-requests': 'manage',
    applicants: 'manage',
    'contact-unlock': 'manage',
    billing: 'none',
    team: 'none',
  },
  viewer: {
    'job-requests': 'view',
    applicants: 'view',
    'contact-unlock': 'none',
    billing: 'none',
    team: 'none',
  },
};

export function getPortalAccessLevel(seatRole: PortalSeatRole, domain: PortalActionDomain): PortalAccessLevel {
  return PORTAL_PERMISSIONS[seatRole][domain];
}

export function hasPortalAccess(
  seatRole: PortalSeatRole,
  domain: PortalActionDomain,
  required: 'view' | 'manage',
): boolean {
  return LEVEL_RANK[getPortalAccessLevel(seatRole, domain)] >= LEVEL_RANK[required];
}
