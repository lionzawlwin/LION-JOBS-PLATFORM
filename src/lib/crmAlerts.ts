import { Resend } from 'resend';
import { getCompanies, getContracts, getCseReps, getB2bLeads } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import type { Contract, CseRep, Company, B2bLead } from '@/types';

const CONTRACT_EXPIRY_DAYS = 30;
const STALE_COMPANY_DAYS = 30;
const NEW_LEAD_HOURS = 24;
const STALE_LEAD_DAYS = 14;
const ROUTE = '/api/cron/job-alerts#crm-digest';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

// Mirrors EnterpriseView.tsx's assignedCseByCompany derivation exactly —
// a company's assigned CSE is its most recent Active contract's cseId,
// not a direct field on Company.
function buildCseNameByCompany(contracts: Contract[], cseReps: CseRep[]): Map<string, string> {
  const cseNameById = new Map(cseReps.map((c) => [c.id, c.name]));
  const map = new Map<string, string>();
  for (const c of contracts) {
    if (c.status !== 'Active' || !c.cseId) continue;
    if (!map.has(c.companyId)) {
      map.set(c.companyId, cseNameById.get(c.cseId) ?? c.cseId);
    }
  }
  return map;
}

function checkExpiringContracts(
  contracts: Contract[],
  companyNameById: Map<string, string>,
  cseNameByCompany: Map<string, string>,
): string[] {
  const problems: string[] = [];
  for (const c of contracts) {
    if (c.status !== 'Active' || !c.endDate) continue;
    const remaining = daysUntil(c.endDate);
    if (remaining <= CONTRACT_EXPIRY_DAYS) {
      const companyName = companyNameById.get(c.companyId) ?? c.companyId;
      const cseName = cseNameByCompany.get(c.companyId);
      const timing = remaining < 0
        ? `expired ${Math.abs(Math.round(remaining))}d ago`
        : `expires in ${Math.round(remaining)}d`;
      problems.push(`Contract for ${companyName}${cseName ? ` (CSE: ${cseName})` : ''} — ${timing}`);
    }
  }
  return problems;
}

function checkStaleCompanies(companies: Company[], cseNameByCompany: Map<string, string>): string[] {
  const problems: string[] = [];
  for (const c of companies) {
    if (c.status !== 'Active' && c.status !== 'In-Contract') continue;
    if (!c.lastContacted) continue;
    const idle = daysSince(c.lastContacted);
    if (idle > STALE_COMPANY_DAYS) {
      const cseName = cseNameByCompany.get(c.id);
      problems.push(`${c.name}${cseName ? ` (CSE: ${cseName})` : ''} — no contact in ${Math.round(idle)}d`);
    }
  }
  return problems;
}

function checkNewLeads(leads: B2bLead[]): string[] {
  const problems: string[] = [];
  for (const l of leads) {
    if (l.status !== 'New') continue;
    const age = hoursSince(l.submittedAt);
    if (age > NEW_LEAD_HOURS) {
      problems.push(`${l.companyName} (${l.contactName}) — new lead unanswered for ${Math.round(age)}h`);
    }
  }
  return problems;
}

function checkStaleLeads(leads: B2bLead[]): string[] {
  const TERMINAL = new Set(['New', 'Placed', 'Rejected', 'Closed']);
  const problems: string[] = [];
  for (const l of leads) {
    if (TERMINAL.has(l.status)) continue;
    const idle = daysSince(l.statusUpdatedAt);
    if (idle > STALE_LEAD_DAYS) {
      problems.push(`${l.companyName} (${l.contactName}) — stuck in "${l.status}" for ${Math.round(idle)}d`);
    }
  }
  return problems;
}

// Called from the daily job-alerts cron alongside runHealthCheck(). Never
// throws — a digest failure must not break the cron it rides on.
export async function runCrmDigest(): Promise<void> {
  try {
    const [companies, contracts, cseReps, leads] = await Promise.all([
      getCompanies(),
      getContracts(),
      getCseReps(),
      getB2bLeads(),
    ]);

    const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
    const cseNameByCompany = buildCseNameByCompany(contracts, cseReps);

    const sections = [
      { title: 'Contracts expiring soon', problems: checkExpiringContracts(contracts, companyNameById, cseNameByCompany) },
      { title: 'Stale companies', problems: checkStaleCompanies(companies, cseNameByCompany) },
      { title: 'New leads needing response', problems: checkNewLeads(leads) },
      { title: 'Stale leads in pipeline', problems: checkStaleLeads(leads) },
    ].filter((s) => s.problems.length > 0);

    if (sections.length === 0) return;

    const alertEmail = process.env.ALERT_EMAIL;
    const resend = getResend();
    if (!alertEmail || !resend) {
      await logFailure({
        category: 'other',
        route:    ROUTE,
        message:  `CRM digest found issues in ${sections.length} section(s) but ALERT_EMAIL/RESEND_API_KEY is not configured`,
        context:  { sectionCount: sections.length },
      });
      return;
    }

    const totalCount = sections.reduce((sum, s) => sum + s.problems.length, 0);

    await resend.emails.send({
      from:    FROM,
      to:      [alertEmail],
      subject: `Lion Jobs Agency — CRM digest: ${totalCount} item(s) need attention`,
      html:    `<div style="font-family:Arial,Helvetica,sans-serif;padding:24px;">
  <h2>CRM Digest</h2>
  ${sections.map((s) => `<h3>${s.title} (${s.problems.length})</h3><ul>${s.problems.map((p) => `<li>${p}</li>`).join('')}</ul>`).join('')}
</div>`,
    });
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    ROUTE,
      message:  'CRM digest itself failed',
      error:    err,
    });
  }
}
