# Phase 7: CRM/Enterprise Alerting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No test suite exists in this repo.** Every task's steps are **Implement → Type-check → Commit**, matching Phases 4-6.

**Goal:** One daily digest email covering four CRM conditions (expiring contracts, stale companies, unanswered new leads, stalled pipeline leads), per `docs/superpowers/specs/2026-07-04-phase-7-crm-alerting-design.md`.

**Architecture:** A new `runCrmDigest()` in `src/lib/crmAlerts.ts`, structured like Phase 6's `runHealthCheck()`, called alongside it from the existing daily `job-alerts` cron. One new DB column (`b2b_leads.status_updated_at`) makes "stuck in pipeline" measurable.

**Tech Stack:** Resend (existing), Supabase (existing accessors + one migration), Next.js Route Handler.

---

## File Structure

**Create:**
- `src/lib/crmAlerts.ts` — `runCrmDigest()`
- `supabase/migrations/0008_add_lead_status_updated_at.sql`

**Modify:**
- `src/types/index.ts` — `B2bLead` gains `statusUpdatedAt`
- `src/lib/db/leads.ts` — `mapToLead` reads the new column; `updateB2bLeadStatus` stamps it
- `src/app/api/cron/job-alerts/route.ts` — call `runCrmDigest()` alongside `runHealthCheck()`
- `supabase/MIGRATIONS.md` — add the `0008` row

---

### Task 1: `B2bLead` type gains `statusUpdatedAt`

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1:** In `src/types/index.ts`, find the `B2bLead` interface:
```ts
export interface B2bLead {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  website: string;
  contactName: string;
  contactTitle: string;
  workEmail: string;
  phone: string;
  jobTitle: string;
  headcount: string;
  workSetup: string;
  salaryBudget: string;
  urgency: string;
  requirements: string;
  agencyMessage: string;
  jobDescription: string;
  benefits: string;
  submittedAt: string;
  status: string;
}
```
Add one field, immediately after `submittedAt`:
```ts
export interface B2bLead {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  website: string;
  contactName: string;
  contactTitle: string;
  workEmail: string;
  phone: string;
  jobTitle: string;
  headcount: string;
  workSetup: string;
  salaryBudget: string;
  urgency: string;
  requirements: string;
  agencyMessage: string;
  jobDescription: string;
  benefits: string;
  submittedAt: string;
  statusUpdatedAt: string;
  status: string;
}
```

- [ ] **Step 2:** Run `npx tsc --noEmit`. Expected: this WILL fail now — `src/lib/db/leads.ts`'s `mapToLead` doesn't set `statusUpdatedAt`, so the returned object won't satisfy the `B2bLead` type. That's expected and gets fixed in Task 3; don't try to fix it in this task.

- [ ] **Step 3:** Commit:
```bash
git add src/types/index.ts
git commit -m "feat(types): add B2bLead.statusUpdatedAt"
```

---

### Task 2: Migration — `b2b_leads.status_updated_at`

**Files:**
- Create: `supabase/migrations/0008_add_lead_status_updated_at.sql`
- Modify: `supabase/MIGRATIONS.md`

- [ ] **Step 1:** Create `supabase/migrations/0008_add_lead_status_updated_at.sql`:
```sql
-- Phase 7: track when a B2B lead's status last changed, not just when it
-- was submitted, so "stuck in the pipeline" can be measured accurately
-- (previously only submitted_at existed, which conflates "old" with
-- "hasn't moved").
ALTER TABLE b2b_leads ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
UPDATE b2b_leads SET status_updated_at = submitted_at WHERE status_updated_at IS NULL;
ALTER TABLE b2b_leads ALTER COLUMN status_updated_at SET DEFAULT now();
ALTER TABLE b2b_leads ALTER COLUMN status_updated_at SET NOT NULL;
```

- [ ] **Step 2:** Run `npx supabase migration list` first — confirm local/remote agree through `0007`. Then run `npx supabase db push`. Expected: confirms `0008_add_lead_status_updated_at.sql` applied.

- [ ] **Step 3:** Verify: run `npx supabase migration list` again — confirm local/remote now agree through `0008`. If the Supabase MCP `list_tables`/query tool is available in this session, spot-check a few `b2b_leads` rows to confirm `status_updated_at` is populated (backfilled to `submitted_at`) and non-null for every existing row.

- [ ] **Step 4:** Update `supabase/MIGRATIONS.md` — add a row to the numbering table:
```markdown
| `0008_add_lead_status_updated_at.sql` | 2026-07-04 | `b2b_leads.status_updated_at` (Phase 7 CRM alerting) |
```
And update the "next migration is" line to say `0009`.

- [ ] **Step 5:** Commit:
```bash
git add supabase/migrations/0008_add_lead_status_updated_at.sql supabase/MIGRATIONS.md
git commit -m "feat(db): add b2b_leads.status_updated_at for Phase 7 stale-lead detection"
```

---

### Task 3: Wire the new column into `src/lib/db/leads.ts`

**Files:**
- Modify: `src/lib/db/leads.ts`

- [ ] **Step 1:** In `mapToLead`, add one line immediately after `submittedAt`:
```ts
function mapToLead(row: Record<string, unknown>): B2bLead {
  return {
    id:             row.id as string,
    companyName:    row.company_name as string,
    industry:       (row.industry as string) ?? '',
    location:       (row.location as string) ?? '',
    website:        (row.website as string) ?? '',
    contactName:    row.contact_name as string,
    contactTitle:   (row.contact_title as string) ?? '',
    workEmail:      row.work_email as string,
    phone:          row.phone as string,
    jobTitle:       row.job_title as string,
    headcount:      (row.headcount as string) ?? '',
    workSetup:      (row.work_setup as string) ?? '',
    salaryBudget:   (row.salary_budget as string) ?? '',
    urgency:        (row.urgency as string) ?? '',
    requirements:   (row.requirements as string) ?? '',
    agencyMessage:  (row.agency_message as string) ?? '',
    jobDescription: (row.job_description as string) ?? '',
    benefits:       (row.benefits as string) ?? '',
    submittedAt:    row.submitted_at as string,
    statusUpdatedAt: row.status_updated_at as string,
    status:         (row.status as string) ?? 'New',
  };
}
```

- [ ] **Step 2:** In `updateB2bLeadStatus`, stamp the column on every call:
```ts
export async function updateB2bLeadStatus(
  id: string,
  status: string,
): Promise<void> {
  const { error } = await supabase
    .from('b2b_leads')
    .update({ status, status_updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`Failed to update lead status: ${error.message}`);
}
```

- [ ] **Step 3:** Run `npx tsc --noEmit` — expect no errors now (this resolves Task 1's expected failure).

- [ ] **Step 4:** Commit:
```bash
git add src/lib/db/leads.ts
git commit -m "feat(db): read/write b2b_leads.status_updated_at in the leads accessor"
```

---

### Task 4: `src/lib/crmAlerts.ts`

**Files:**
- Create: `src/lib/crmAlerts.ts`

- [ ] **Step 1: Write it**

```ts
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
```

Note: `category: 'other'` is used (not a new category) — `FailureCategory` stays at its existing 5 values, per the design spec's explicit note that this doesn't warrant a 6th.

- [ ] **Step 2:** Run `npx tsc --noEmit` — expect no errors. Confirm `getContracts()` can be called with zero arguments (it takes an optional `companyId?: string` — check `src/lib/db/contracts.ts` to confirm calling it with no args returns ALL contracts, not none).

- [ ] **Step 3:** Commit:
```bash
git add src/lib/crmAlerts.ts
git commit -m "feat(observability): add runCrmDigest() for contract/company/lead alerts"
```

---

### Task 5: Wire into `job-alerts` cron

**Files:**
- Modify: `src/app/api/cron/job-alerts/route.ts`

- [ ] **Step 1:** Read the current file first (it already calls `runHealthCheck()` from Phase 6). Add the import:
```ts
import { runCrmDigest } from '@/lib/crmAlerts';
```
Add `await runCrmDigest();` immediately after the existing `await runHealthCheck();` line, so the try block starts:
```ts
  try {
    await runHealthCheck();
    await runCrmDigest();

    const jobs = await getJobs();
    // ...rest of the function is completely unchanged from here down
```

- [ ] **Step 2:** Run `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3:** Commit:
```bash
git add src/app/api/cron/job-alerts
git commit -m "feat(cron): run CRM digest alongside health check in the daily job-alerts cron"
```

---

### Task 6: Final verification, PROGRESS.md, push

**Files:** none new — verification + `PROGRESS.md`

- [ ] **Step 1:** Run `npx tsc --noEmit` — expect clean.

- [ ] **Step 2:** Confirm no new Vercel cron: `git diff main -- vercel.json` — expect empty.

- [ ] **Step 3:** Confirm the migration applied: `npx supabase migration list` — local/remote agree through `0008`.

- [ ] **Step 4:** Update `PROGRESS.md` — append below the Phase 6 section:
```markdown

---

# Phase 7: CRM/Enterprise Alerting — Progress

Spec: `docs/superpowers/specs/2026-07-04-phase-7-crm-alerting-design.md`
Plan: `docs/superpowers/plans/2026-07-04-phase-7-crm-alerting.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)
Branch: `feat/phase-7-crm-alerting`, pushed to origin. PR not yet opened — needs to be created manually and merged by a human (`gh` unavailable in this environment).

| Task | Description | Status |
|------|--------------|--------|
| 1 | B2bLead.statusUpdatedAt type | ✅ Done |
| 2 | b2b_leads.status_updated_at migration | ✅ Done |
| 3 | Wire new column into leads.ts accessor | ✅ Done |
| 4 | src/lib/crmAlerts.ts | ✅ Done |
| 5 | Wire into job-alerts cron | ✅ Done |
| 6 | Final verification | ✅ Done |

## Log

- 2026-07-04: One digest email covering 4 triggers (expiring contracts, stale companies, unanswered new leads, stalled pipeline leads), piggybacked on the existing daily `job-alerts` cron alongside Phase 6's health check — same Vercel Hobby-plan constraint, no new cron.
- 2026-07-04: `b2b_leads` had no way to measure "stuck in pipeline" — only `submitted_at` existed, which conflates lead age with stall time. Added `status_updated_at`, backfilled to `submitted_at` for existing rows, stamped on every future `updateB2bLeadStatus()` call.
- 2026-07-04: CSE attribution for companies/contracts reuses the exact derivation `EnterpriseView.tsx` already uses (most recent Active contract's cseId) — no new data relationship. B2B leads have no CSE assignment anywhere in the data model, so those two triggers list without CSE attribution by design.
- 2026-07-04: Explicitly out of scope, per the approved spec: per-CSE targeted emails, new dashboard UI, configurable thresholds, alerting on other CRM entities (Interactions, CseRep activity).
- 2026-07-04: Could not verify the digest email actually arrives via Resend, or that migration 0008's backfill produced sensible values on live data, from this environment — recommend the repo owner spot-check both after merge.
```

- [ ] **Step 5:** Commit:
```bash
git add PROGRESS.md
git commit -m "docs: record Phase 7 CRM alerting completion in PROGRESS.md"
```

- [ ] **Step 6:** Push the branch:
```bash
git push -u origin feat/phase-7-crm-alerting
```

Report the compare URL back — **do not open or merge the PR**; wait for the repo owner to review and merge, and do not start a new phase until they confirm.

---

## Self-Review Notes

**Spec coverage:** all 4 triggers (Task 4), the data-model gap (Tasks 1-3), the piggyback wiring (Task 5), and the non-goals (no new cron, no new UI, no per-CSE routing, no 5th `FailureCategory`) are all reflected. Nothing in the plan does anything the spec's non-goals list excludes.

**Type consistency:** `B2bLead.statusUpdatedAt` defined once (Task 1), read/written once each (Task 3), consumed once (Task 4's `checkStaleLeads`) — no naming drift. `runCrmDigest()` defined once (Task 4), called once (Task 5).

**No placeholders:** every step shows exact code or exact before/after diffs.
