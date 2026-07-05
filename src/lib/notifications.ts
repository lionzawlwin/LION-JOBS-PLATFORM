import type { JobRequest, SystemEvent, B2bLead, Contract, NotificationItem } from '@/types';

const CONTRACT_EXPIRY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function buildNotifications(input: {
  jobRequests: JobRequest[];
  systemEvents: SystemEvent[];
  leads: B2bLead[];
  contracts: Contract[];
  now: Date;
}): NotificationItem[] {
  const items: NotificationItem[] = [];

  for (const jr of input.jobRequests) {
    if (jr.status !== 'Pending') continue;
    items.push({
      id: jr.id,
      type: 'job_request',
      title: `New job request: ${jr.title}`,
      detail: `${jr.location} · submitted ${jr.submittedAt}`,
      href: 'manage-jobs',
      createdAt: jr.submittedAt,
    });
  }

  for (const evt of input.systemEvents) {
    if (evt.resolvedAt) continue;
    items.push({
      id: evt.id,
      type: 'system_event',
      title: `System error: ${evt.category}`,
      detail: evt.message,
      href: 'system-health',
      createdAt: evt.createdAt,
    });
  }

  for (const lead of input.leads) {
    if (lead.claimedByCseRepId) continue;
    items.push({
      id: lead.id,
      type: 'unclaimed_lead',
      title: `Unclaimed lead: ${lead.companyName}`,
      detail: `${lead.contactName} · submitted ${lead.submittedAt}`,
      href: 'b2b-leads',
      createdAt: lead.submittedAt,
    });
  }

  const nowMs = input.now.getTime();
  for (const contract of input.contracts) {
    if (contract.status !== 'Active' || !contract.endDate) continue;
    const endMs = new Date(contract.endDate).getTime();
    if (endMs < nowMs || endMs > nowMs + CONTRACT_EXPIRY_WINDOW_MS) continue;
    items.push({
      id: contract.id,
      type: 'contract_expiring',
      title: `Contract expiring: ${contract.contractType}`,
      detail: `Ends ${contract.endDate}`,
      href: 'enterprise',
      createdAt: contract.endDate,
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
