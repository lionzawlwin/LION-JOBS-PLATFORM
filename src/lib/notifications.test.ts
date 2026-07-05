import { describe, it, expect } from 'vitest';
import { buildNotifications } from './notifications';
import type { JobRequest, SystemEvent, B2bLead, Contract } from '@/types';

const NOW = new Date('2026-07-06T00:00:00.000Z');

function jobRequest(overrides: Partial<JobRequest> = {}): JobRequest {
  return {
    id: 'jr-1', companyId: 'co-1', title: 'Backend Engineer', location: 'Yangon',
    category: 'Engineering', type: 'Full-time', salaryMin: 100, salaryMax: 200,
    currency: 'USD', description: '', requirements: [], status: 'Pending',
    submittedAt: '2026-07-05T00:00:00.000Z', reviewedBy: null, reviewedAt: null,
    rejectionNote: null, ...overrides,
  };
}

function systemEvent(overrides: Partial<SystemEvent> = {}): SystemEvent {
  return {
    id: 'evt-1', category: 'cron', level: 'error', route: '/api/cron/job-alerts',
    message: 'boom', context: null, createdAt: '2026-07-05T00:00:00.000Z',
    resolvedAt: null, resolvedBy: null, ...overrides,
  };
}

function lead(overrides: Partial<B2bLead> = {}): B2bLead {
  return {
    id: 'lead-1', companyName: 'Acme', industry: '', location: '', website: '',
    contactName: 'Jane', contactTitle: '', workEmail: 'jane@acme.com', phone: '',
    jobTitle: '', headcount: '', workSetup: '', salaryBudget: '', urgency: '',
    requirements: '', agencyMessage: '', jobDescription: '', benefits: '',
    submittedAt: '2026-07-05T00:00:00.000Z', statusUpdatedAt: '2026-07-05T00:00:00.000Z',
    status: 'New', claimedByCseRepId: null, claimedAt: null, ...overrides,
  };
}

function contract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'ct-1', companyId: 'co-1', value: 1000, currency: 'USD',
    contractType: 'Retainer', status: 'Active', startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-07-20T00:00:00.000Z', cseId: null, notes: '',
    createdAt: '2026-01-01T00:00:00.000Z', ...overrides,
  };
}

describe('buildNotifications', () => {
  it('maps a pending job request to a notification item', () => {
    const items = buildNotifications({
      jobRequests: [jobRequest()], systemEvents: [], leads: [], contracts: [], now: NOW,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'job_request', href: 'manage-jobs' });
  });

  it('excludes non-pending job requests', () => {
    const items = buildNotifications({
      jobRequests: [jobRequest({ status: 'Approved' }), jobRequest({ status: 'Rejected' })],
      systemEvents: [], leads: [], contracts: [], now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it('maps unresolved system events to notification items', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [systemEvent()], leads: [], contracts: [], now: NOW,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'system_event', href: 'system-health' });
  });

  it('excludes resolved system events', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [systemEvent({ resolvedAt: '2026-07-05T12:00:00.000Z' })],
      leads: [], contracts: [], now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it('maps unclaimed leads to notification items', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [], leads: [lead()], contracts: [], now: NOW,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'unclaimed_lead', href: 'b2b-leads' });
  });

  it('excludes claimed leads', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [], leads: [lead({ claimedByCseRepId: 'rep-1' })],
      contracts: [], now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it('includes active contracts expiring within 30 days', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [], leads: [],
      contracts: [contract({ endDate: '2026-07-20T00:00:00.000Z' })], now: NOW,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'contract_expiring', href: 'enterprise' });
  });

  it('excludes contracts expiring beyond 30 days', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [], leads: [],
      contracts: [contract({ endDate: '2026-12-01T00:00:00.000Z' })], now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it('excludes contracts that already expired', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [], leads: [],
      contracts: [contract({ endDate: '2026-07-01T00:00:00.000Z' })], now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it('excludes non-active contracts even if endDate is within window', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [], leads: [],
      contracts: [contract({ status: 'Draft', endDate: '2026-07-20T00:00:00.000Z' })], now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it('excludes contracts with a null endDate', () => {
    const items = buildNotifications({
      jobRequests: [], systemEvents: [], leads: [],
      contracts: [contract({ endDate: null })], now: NOW,
    });
    expect(items).toHaveLength(0);
  });

  it('sorts newest-first across mixed types', () => {
    const items = buildNotifications({
      jobRequests: [jobRequest({ id: 'jr-old', submittedAt: '2026-07-01T00:00:00.000Z' })],
      systemEvents: [systemEvent({ id: 'evt-new', createdAt: '2026-07-05T23:00:00.000Z' })],
      leads: [], contracts: [], now: NOW,
    });
    expect(items.map((i) => i.id)).toEqual(['evt-new', 'jr-old']);
  });
});
