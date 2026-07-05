import { describe, it, expect, vi, beforeEach } from 'vitest';

// RBAC Step 2 (Layer 6, Dynamic RBAC): getAccessLevel/hasAccess are now
// async and read through getCachedRolePermissions, which wraps its query
// in next/cache's unstable_cache. unstable_cache throws
// ("Invariant: incrementalCache missing") outside a real Next.js request
// lifecycle -- confirmed by direct probe, not assumed -- so it can never
// be called for real inside a Vitest node environment. The whole module
// is mocked here rather than hitting a live Supabase instance, keeping
// this suite the same fast, deterministic, zero-I/O unit test it always
// was; the real DB-backed path is exercised by manual/live verification,
// same as enterpriseStats.ts's equally untested-in-CI cached export.
vi.mock('@/lib/db/rolePermissions', () => ({
  getCachedRolePermissions: vi.fn(),
}));

import { getCachedRolePermissions } from '@/lib/db/rolePermissions';
import { PERMISSIONS, getAccessLevel, hasAccess, ALL_TAB_DOMAINS } from './permissions';
import type { StaffRole } from '@/types';

const ALL_DOMAINS = ALL_TAB_DOMAINS;
const ALL_ROLES: StaffRole[] = ['owner', 'admin', 'cse', 'viewer'];

const mockedGetCachedRolePermissions = vi.mocked(getCachedRolePermissions);

// Flattened seed rows matching PERMISSIONS exactly -- simulates the DB
// agreeing with the hardcoded fallback, which migration 0017's seed
// guarantees is true on day one.
const SEED_ROWS = ALL_ROLES.flatMap((role) =>
  ALL_DOMAINS.map((tabDomain) => ({
    role,
    tabDomain,
    accessLevel: PERMISSIONS[role][tabDomain],
  })),
);

beforeEach(() => {
  mockedGetCachedRolePermissions.mockReset();
  mockedGetCachedRolePermissions.mockResolvedValue(SEED_ROWS);
});

describe('PERMISSIONS matrix shape', () => {
  it('defines every domain for every role — a missing cell would be a silent access hole', () => {
    for (const role of ALL_ROLES) {
      for (const domain of ALL_DOMAINS) {
        expect(PERMISSIONS[role][domain]).toBeDefined();
      }
    }
  });
});

describe('owner and admin — full access everywhere', () => {
  it.each(ALL_DOMAINS)('grants manage on %s', async (domain) => {
    expect(await getAccessLevel('owner', domain)).toBe('manage');
    expect(await getAccessLevel('admin', domain)).toBe('manage');
  });
});

describe('cse — CRM domain manage, recruitment/marketing none, some view-only', () => {
  it('has manage access to the Companies/Enterprise/B2B CRM domain', async () => {
    expect(await getAccessLevel('cse', 'companies')).toBe('manage');
    expect(await getAccessLevel('cse', 'enterprise')).toBe('manage');
    expect(await getAccessLevel('cse', 'b2b-leads')).toBe('manage');
  });

  it('has view-only access to Legal/Billing/Overview', async () => {
    expect(await getAccessLevel('cse', 'overview')).toBe('view');
    expect(await getAccessLevel('cse', 'legal')).toBe('view');
    expect(await getAccessLevel('cse', 'billing')).toBe('view');
  });

  it('has no access to recruitment or marketing tabs', async () => {
    expect(await getAccessLevel('cse', 'candidates')).toBe('none');
    expect(await getAccessLevel('cse', 'post-job')).toBe('none');
    expect(await getAccessLevel('cse', 'manage-jobs')).toBe('none');
    expect(await getAccessLevel('cse', 'content')).toBe('none');
    expect(await getAccessLevel('cse', 'campaigns')).toBe('none');
  });

  it('has no access to Team or System Health', async () => {
    expect(await getAccessLevel('cse', 'team')).toBe('none');
    expect(await getAccessLevel('cse', 'system-health')).toBe('none');
  });
});

describe('viewer — read-only everywhere except Post Job/Team/System Health', () => {
  it('has no access to Post Job, Team, or System Health', async () => {
    expect(await getAccessLevel('viewer', 'post-job')).toBe('none');
    expect(await getAccessLevel('viewer', 'team')).toBe('none');
    expect(await getAccessLevel('viewer', 'system-health')).toBe('none');
  });

  it('has view access to every other domain', async () => {
    const exempt = new Set(['post-job', 'team', 'system-health']);
    for (const domain of ALL_DOMAINS) {
      if (exempt.has(domain)) continue;
      expect(await getAccessLevel('viewer', domain)).toBe('view');
    }
  });
});

describe('System Health — follows Team & Access exactly (per CLAUDE.md)', () => {
  it.each(ALL_ROLES)('matches Team\'s access level for %s', async (role) => {
    expect(await getAccessLevel(role, 'system-health')).toBe(await getAccessLevel(role, 'team'));
  });
});

describe('hasAccess() rank comparison', () => {
  it('treats manage as satisfying a view requirement', async () => {
    expect(await hasAccess('owner', 'candidates', 'view')).toBe(true);
  });

  it('treats view as NOT satisfying a manage requirement', async () => {
    expect(await hasAccess('viewer', 'candidates', 'manage')).toBe(false);
  });

  it('treats none as failing both view and manage requirements', async () => {
    expect(await hasAccess('cse', 'candidates', 'view')).toBe(false);
    expect(await hasAccess('cse', 'candidates', 'manage')).toBe(false);
  });

  it('treats exact-level match as satisfying the requirement', async () => {
    expect(await hasAccess('viewer', 'candidates', 'view')).toBe(true);
  });
});

describe('DB-backed matrix (RBAC Step 2)', () => {
  it('overrides the hardcoded fallback when role_permissions disagrees', async () => {
    mockedGetCachedRolePermissions.mockResolvedValue([
      { role: 'cse', tabDomain: 'overview', accessLevel: 'manage' }, // PERMISSIONS.cse.overview is 'view'
    ]);
    expect(await getAccessLevel('cse', 'overview')).toBe('manage');
    // Cells not returned by the DB still fall back to PERMISSIONS -- a
    // partial result must never leave a hole.
    expect(await getAccessLevel('cse', 'companies')).toBe('manage'); // PERMISSIONS.cse.companies, unaffected
    expect(await getAccessLevel('viewer', 'overview')).toBe('view'); // untouched role, unaffected
  });

  it('ignores a row with an unrecognized role/domain/level rather than throwing', async () => {
    mockedGetCachedRolePermissions.mockResolvedValue([
      { role: 'superadmin', tabDomain: 'overview', accessLevel: 'manage' },
      { role: 'cse', tabDomain: 'not-a-real-tab', accessLevel: 'manage' },
      { role: 'cse', tabDomain: 'overview', accessLevel: 'godmode' },
    ]);
    expect(await getAccessLevel('cse', 'overview')).toBe('view'); // untouched, falls back to PERMISSIONS
  });

  it('fails closed to the hardcoded matrix when the DB read throws', async () => {
    mockedGetCachedRolePermissions.mockRejectedValue(new Error('connection refused'));
    for (const role of ALL_ROLES) {
      for (const domain of ALL_DOMAINS) {
        expect(await getAccessLevel(role, domain)).toBe(PERMISSIONS[role][domain]);
      }
    }
  });

  it('fails closed to the hardcoded matrix when the DB returns no rows', async () => {
    mockedGetCachedRolePermissions.mockResolvedValue([]);
    expect(await getAccessLevel('owner', 'team')).toBe('manage');
    expect(await getAccessLevel('viewer', 'post-job')).toBe('none');
  });
});
