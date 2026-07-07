import { describe, expect, it } from 'vitest';
import { hasPortalAccess, PORTAL_PERMISSIONS, type PortalActionDomain, type PortalSeatRole } from './portalPermissions';

const ALL_DOMAINS: PortalActionDomain[] = ['job-requests', 'applicants', 'contact-unlock', 'billing', 'team'];
const ALL_ROLES: PortalSeatRole[] = ['owner', 'hiring_manager', 'viewer'];

describe('portalPermissions', () => {
  it('defines every (role x domain) cell -- no gaps in the matrix', () => {
    for (const role of ALL_ROLES) {
      for (const domain of ALL_DOMAINS) {
        expect(PORTAL_PERMISSIONS[role][domain]).toBeDefined();
      }
    }
  });

  it('owner has manage access everywhere', () => {
    for (const domain of ALL_DOMAINS) {
      expect(hasPortalAccess('owner', domain, 'manage')).toBe(true);
    }
  });

  it('viewer never has manage access anywhere', () => {
    for (const domain of ALL_DOMAINS) {
      expect(hasPortalAccess('viewer', domain, 'manage')).toBe(false);
    }
  });

  it('viewer has view access to job-requests and applicants only', () => {
    expect(hasPortalAccess('viewer', 'job-requests', 'view')).toBe(true);
    expect(hasPortalAccess('viewer', 'applicants', 'view')).toBe(true);
    expect(hasPortalAccess('viewer', 'contact-unlock', 'view')).toBe(false);
    expect(hasPortalAccess('viewer', 'billing', 'view')).toBe(false);
    expect(hasPortalAccess('viewer', 'team', 'view')).toBe(false);
  });

  it('hiring_manager can manage recruitment domains but not billing or team', () => {
    expect(hasPortalAccess('hiring_manager', 'job-requests', 'manage')).toBe(true);
    expect(hasPortalAccess('hiring_manager', 'applicants', 'manage')).toBe(true);
    expect(hasPortalAccess('hiring_manager', 'contact-unlock', 'manage')).toBe(true);
    expect(hasPortalAccess('hiring_manager', 'billing', 'view')).toBe(false);
    expect(hasPortalAccess('hiring_manager', 'team', 'view')).toBe(false);
  });

  it('only owner can manage team seats', () => {
    expect(hasPortalAccess('owner', 'team', 'manage')).toBe(true);
    expect(hasPortalAccess('hiring_manager', 'team', 'manage')).toBe(false);
    expect(hasPortalAccess('viewer', 'team', 'manage')).toBe(false);
  });
});
