import { describe, it, expect } from 'vitest';
import { PERMISSIONS, getAccessLevel, hasAccess, type TabDomain } from './permissions';
import type { StaffRole } from '@/types';

const ALL_DOMAINS: TabDomain[] = [
  'overview', 'candidates', 'post-job', 'manage-jobs', 'companies',
  'enterprise', 'b2b-leads', 'content', 'campaigns', 'legal',
  'billing', 'team', 'system-health',
];

const ALL_ROLES: StaffRole[] = ['owner', 'admin', 'cse', 'viewer'];

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
  it.each(ALL_DOMAINS)('grants manage on %s', (domain) => {
    expect(getAccessLevel('owner', domain)).toBe('manage');
    expect(getAccessLevel('admin', domain)).toBe('manage');
  });
});

describe('cse — CRM domain manage, recruitment/marketing none, some view-only', () => {
  it('has manage access to the Companies/Enterprise/B2B CRM domain', () => {
    expect(getAccessLevel('cse', 'companies')).toBe('manage');
    expect(getAccessLevel('cse', 'enterprise')).toBe('manage');
    expect(getAccessLevel('cse', 'b2b-leads')).toBe('manage');
  });

  it('has view-only access to Legal/Billing/Overview', () => {
    expect(getAccessLevel('cse', 'overview')).toBe('view');
    expect(getAccessLevel('cse', 'legal')).toBe('view');
    expect(getAccessLevel('cse', 'billing')).toBe('view');
  });

  it('has no access to recruitment or marketing tabs', () => {
    expect(getAccessLevel('cse', 'candidates')).toBe('none');
    expect(getAccessLevel('cse', 'post-job')).toBe('none');
    expect(getAccessLevel('cse', 'manage-jobs')).toBe('none');
    expect(getAccessLevel('cse', 'content')).toBe('none');
    expect(getAccessLevel('cse', 'campaigns')).toBe('none');
  });

  it('has no access to Team or System Health', () => {
    expect(getAccessLevel('cse', 'team')).toBe('none');
    expect(getAccessLevel('cse', 'system-health')).toBe('none');
  });
});

describe('viewer — read-only everywhere except Post Job/Team/System Health', () => {
  it('has no access to Post Job, Team, or System Health', () => {
    expect(getAccessLevel('viewer', 'post-job')).toBe('none');
    expect(getAccessLevel('viewer', 'team')).toBe('none');
    expect(getAccessLevel('viewer', 'system-health')).toBe('none');
  });

  it('has view access to every other domain', () => {
    const exempt = new Set(['post-job', 'team', 'system-health']);
    for (const domain of ALL_DOMAINS) {
      if (exempt.has(domain)) continue;
      expect(getAccessLevel('viewer', domain)).toBe('view');
    }
  });
});

describe('System Health — follows Team & Access exactly (per CLAUDE.md)', () => {
  it.each(ALL_ROLES)('matches Team\'s access level for %s', (role) => {
    expect(getAccessLevel(role, 'system-health')).toBe(getAccessLevel(role, 'team'));
  });
});

describe('hasAccess() rank comparison', () => {
  it('treats manage as satisfying a view requirement', () => {
    expect(hasAccess('owner', 'candidates', 'view')).toBe(true);
  });

  it('treats view as NOT satisfying a manage requirement', () => {
    expect(hasAccess('viewer', 'candidates', 'manage')).toBe(false);
  });

  it('treats none as failing both view and manage requirements', () => {
    expect(hasAccess('cse', 'candidates', 'view')).toBe(false);
    expect(hasAccess('cse', 'candidates', 'manage')).toBe(false);
  });

  it('treats exact-level match as satisfying the requirement', () => {
    expect(hasAccess('viewer', 'candidates', 'view')).toBe(true);
  });
});
