# B2B Billing & Invoicing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin set a candidate's final agreed salary once they're Hired, generate a snapshotted printable invoice (candidate, position, agreed salary, commission rate, computed fee) tied to a specific company, and track invoice status in a new Billing dashboard tab.

**Architecture:** Extends the existing `applications` table with a `final_agreed_salary` column and adds a new, mostly-immutable `invoices` table whose figures are snapshotted at generation time (never recomputed from live `agency_settings`/`companies` data), mirroring the `candidate_consents` audit-record pattern from the Legal Docs subsystem. A new "Billing" dashboard tab lists/filters invoices; a new print route (reusing the existing `AutoPrint.tsx`) renders them.

**Tech Stack:** Next.js 16 App Router (Route Handlers, Server Components), Supabase, next-auth, SWR, Tailwind v4. No test framework (per `CLAUDE.md`) — verification is `npx tsc --noEmit`, `npm run lint`, and manual walkthrough.

---

## ⚠️ Amendments to the approved spec (found while writing this plan)

1. **Company linkage.** The approved spec's Candidate Drawer flow assumed the invoice's `companyId` was simply known. It isn't — `Candidate`/`applications` only stores a free-text `company` name string (via the linked Job), with no foreign key into the `companies` table Legal Docs uses for commission rates. Task 9 below adds an explicit company `<select>` to the "Generate Invoice" flow, pre-selected via a best-effort name match against `candidate.company`, always admin-confirmable before generating.
2. **`invoices.company_id` cascade behavior.** The spec's table sketch didn't specify `ON DELETE` behavior for `company_id`. Applying the same lesson learned on `candidate_consents` in the Legal Docs subsystem: an invoice is a financial record that must survive the company/application rows it references being deleted later. `company_id` and `application_id` are both nullable with `ON DELETE SET NULL`, and `company_name` is snapshotted onto the row (not just `company_id`) so a deleted company doesn't leave an unlabeled invoice.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/add_billing_invoicing.sql`

Same convention as the two prior migrations in this repo — pasted into the Supabase SQL Editor by hand, not auto-applied.

- [ ] **Step 1: Write the migration file**

```sql
-- B2B Billing & Invoicing: final agreed salary on applications, invoices table.
-- Run this in Supabase SQL Editor once.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS final_agreed_salary NUMERIC;

-- company_id/application_id are nullable with ON DELETE SET NULL, and
-- company_name is snapshotted (not just company_id): an invoice is a
-- financial/accounting record that must remain intact and legible even if
-- the company or the placement's application row is later deleted — same
-- reasoning as candidate_consents in the Legal Docs subsystem.
CREATE TABLE IF NOT EXISTS invoices (
  id                  TEXT PRIMARY KEY,
  invoice_number      TEXT NOT NULL UNIQUE,
  company_id          TEXT REFERENCES companies(id) ON DELETE SET NULL,
  company_name        TEXT NOT NULL,
  application_id      TEXT REFERENCES applications(id) ON DELETE SET NULL,
  candidate_name      TEXT NOT NULL,
  position            TEXT NOT NULL,
  agreed_salary       NUMERIC NOT NULL,
  commission_rate_pct NUMERIC NOT NULL,
  commission_fee_mmk  NUMERIC NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Draft',
  issued_at           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_application_id ON invoices(application_id);
```

- [ ] **Step 2: Run it in Supabase**

Open the Supabase dashboard → SQL Editor → paste the contents of `add_billing_invoicing.sql` → Run.

- [ ] **Step 3: Verify**

```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices';
```

Expected: all 12 columns listed above.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/add_billing_invoicing.sql
git commit -m "feat(db): add invoices table and final_agreed_salary column"
```

**Do not execute this SQL against any live database yourself** — same constraint as every prior migration in this project. Only create and commit the file; running it is a manual step for a human with Supabase dashboard access.

---

## Task 2: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add `finalAgreedSalary` to `Candidate`**

Inside `export interface Candidate { ... }`, add after `needsConsent?: boolean;`:

```typescript
  finalAgreedSalary?: number;
```

- [ ] **Step 2: Add `InvoiceStatus` and `Invoice` types**

Append to the end of `src/types/index.ts`:

```typescript
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string | null;
  companyName: string;
  applicationId: string | null;
  candidateName: string;
  position: string;
  agreedSalary: number;
  commissionRatePct: number;
  commissionFeeMmk: number;
  status: InvoiceStatus;
  issuedAt: string;
  createdAt: string;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add Invoice, InvoiceStatus, and Candidate.finalAgreedSalary"
```

---

## Task 3: `invoices` data access + `candidates.ts` extension

**Files:**
- Create: `src/lib/db/invoices.ts`
- Modify: `src/lib/db/candidates.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Write `src/lib/db/invoices.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { Invoice, InvoiceStatus } from '@/types';

function mapToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id:                row.id as string,
    invoiceNumber:     row.invoice_number as string,
    companyId:         (row.company_id as string) ?? null,
    companyName:       row.company_name as string,
    applicationId:     (row.application_id as string) ?? null,
    candidateName:     row.candidate_name as string,
    position:          row.position as string,
    agreedSalary:      Number(row.agreed_salary),
    commissionRatePct: Number(row.commission_rate_pct),
    commissionFeeMmk:  Number(row.commission_fee_mmk),
    status:            row.status as InvoiceStatus,
    issuedAt:          row.issued_at as string,
    createdAt:         row.created_at as string,
  };
}

export async function getInvoices(filters?: {
  companyId?: string;
  status?:    string;
}): Promise<Invoice[]> {
  let query = supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (filters?.companyId) query = query.eq('company_id', filters.companyId);
  if (filters?.status)    query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) {
    console.error('[db/invoices] getInvoices error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return mapToInvoice(data);
}

export async function getInvoiceByApplicationId(applicationId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();
  if (error || !data) return null;
  return mapToInvoice(data);
}

export async function createInvoice(data: {
  companyId:         string;
  companyName:       string;
  applicationId:     string;
  candidateName:     string;
  position:          string;
  agreedSalary:      number;
  commissionRatePct: number;
}): Promise<Invoice> {
  const { count, error: countError } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });
  if (countError) throw new Error(`Failed to compute invoice number: ${countError.message}`);

  const sequence     = (count ?? 0) + 1;
  const invoiceNumber = `INV-${String(sequence).padStart(5, '0')}`;
  const id            = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const commissionFeeMmk = Math.round(data.agreedSalary * data.commissionRatePct / 100);

  const { error } = await supabase.from('invoices').insert({
    id,
    invoice_number:      invoiceNumber,
    company_id:          data.companyId,
    company_name:        data.companyName,
    application_id:      data.applicationId,
    candidate_name:      data.candidateName,
    position:            data.position,
    agreed_salary:       data.agreedSalary,
    commission_rate_pct: data.commissionRatePct,
    commission_fee_mmk:  commissionFeeMmk,
    status:              'Draft',
  });
  if (error) throw new Error(`Failed to create invoice: ${error.message}`);

  const invoice = await getInvoiceById(id);
  if (!invoice) throw new Error('Invoice created but could not be re-fetched.');
  return invoice;
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw new Error(`Failed to update invoice status: ${error.message}`);
}
```

- [ ] **Step 2: Add `final_agreed_salary` to `candidates.ts`**

In `src/lib/db/candidates.ts`, inside `interface AppRow { ... }`, add after `interviewer_contact: string | null;`:

```typescript
  final_agreed_salary: number | null;
```

Inside `mapToCandidate`, add after the `interviewerContact:` line:

```typescript
    finalAgreedSalary: app.final_agreed_salary ?? undefined,
```

In **both** `.select()` calls in `candidates.ts` (`getCandidates()` and `getCandidatesByEmailOrPhone()`), find the line `interview_date, interview_location, interviewer_contact,` and change it to:

```typescript
        interview_date, interview_location, interviewer_contact, final_agreed_salary,
```

- [ ] **Step 3: Add `updateCandidateFinalSalary` to `candidates.ts`**

Append to `src/lib/db/candidates.ts`:

```typescript
export async function updateCandidateFinalSalary(
  applicationId:     string,
  finalAgreedSalary: number,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ final_agreed_salary: finalAgreedSalary })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to update final agreed salary: ${error.message}`);
}
```

- [ ] **Step 4: Export the new module from the barrel**

In `src/lib/db/index.ts`, add:

```typescript
export * from './invoices';
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/invoices.ts src/lib/db/candidates.ts src/lib/db/index.ts
git commit -m "feat(db): add invoices data access and final agreed salary accessor"
```

---

## Task 4: Final-salary API route

**Files:**
- Create: `src/app/api/candidates/[id]/final-salary/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCandidateFinalSalary } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: { finalAgreedSalary?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    typeof body.finalAgreedSalary !== 'number' ||
    !Number.isFinite(body.finalAgreedSalary) ||
    body.finalAgreedSalary < 0
  ) {
    return Response.json({ error: 'finalAgreedSalary must be a non-negative number.' }, { status: 422 });
  }

  try {
    await updateCandidateFinalSalary(id, body.finalAgreedSalary);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[final-salary/patch]', err);
    return Response.json({ error: 'Could not update final agreed salary.' }, { status: 502 });
  }
}
```

Note: this route validates the numeric value inline rather than leaving it to TypeScript's compile-time-only typing — this codebase's code review already established (Task 5/6 of the Legal Docs subsystem) that admin-write numeric fields need a runtime range/type guard, not just a type annotation.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/candidates/[id]/final-salary/route.ts
git commit -m "feat(api): add final agreed salary PATCH route"
```

---

## Task 5: Invoice API routes

**Files:**
- Create: `src/app/api/invoices/route.ts`
- Create: `src/app/api/invoices/[id]/route.ts`
- Create: `src/app/api/candidates/[id]/invoice/route.ts`

- [ ] **Step 1: Write the list + create route**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInvoices, getInvoiceByApplicationId, createInvoice, getCompanyById, getAgencySettings } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get('companyId') ?? undefined;
  const status    = req.nextUrl.searchParams.get('status') ?? undefined;
  const invoices  = await getInvoices({ companyId, status });
  return Response.json(invoices);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    applicationId?: string;
    candidateName?: string;
    position?:      string;
    companyId?:     string;
    agreedSalary?:  number;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { applicationId, candidateName, position, companyId, agreedSalary } = body;
  if (
    !applicationId || !candidateName || !position || !companyId ||
    typeof agreedSalary !== 'number' || !Number.isFinite(agreedSalary) || agreedSalary <= 0
  ) {
    return Response.json(
      { error: 'applicationId, candidateName, position, companyId, and a positive agreedSalary are required.' },
      { status: 422 },
    );
  }

  const existing = await getInvoiceByApplicationId(applicationId);
  if (existing) {
    return Response.json(
      { error: 'An invoice already exists for this application.', invoiceId: existing.id },
      { status: 409 },
    );
  }

  const company = await getCompanyById(companyId);
  if (!company) {
    return Response.json({ error: 'Company not found.' }, { status: 404 });
  }

  const settings = await getAgencySettings();
  const commissionRatePct = company.commissionRatePct ?? settings.defaultCommissionRatePct;

  try {
    const invoice = await createInvoice({
      companyId,
      companyName: company.name,
      applicationId,
      candidateName,
      position,
      agreedSalary,
      commissionRatePct,
    });
    return Response.json(invoice, { status: 201 });
  } catch (err) {
    console.error('[invoices/post]', err);
    return Response.json({ error: 'Could not create invoice.' }, { status: 502 });
  }
}
```

- [ ] **Step 2: Write the single-invoice GET + status PATCH route**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInvoiceById, updateInvoiceStatus } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { InvoiceStatus } from '@/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';
const VALID_STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceById(id);
  if (!invoice) return Response.json({ error: 'Invoice not found.' }, { status: 404 });
  return Response.json(invoice);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status as InvoiceStatus)) {
    return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 422 });
  }

  try {
    await updateInvoiceStatus(id, body.status as InvoiceStatus);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[invoices/[id]/patch]', err);
    return Response.json({ error: 'Could not update invoice status.' }, { status: 502 });
  }
}
```

- [ ] **Step 3: Write the per-candidate invoice-existence check route**

Mirrors `/api/candidates/[id]/consent`'s `GET` from the Legal Docs subsystem — the Candidate Drawer needs to know whether an invoice already exists for a given application before showing "Generate" vs. "View".

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInvoiceByApplicationId } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await getInvoiceByApplicationId(id);
  return Response.json({ invoice });
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

With `npm run dev` running:

```bash
curl -X POST http://localhost:3001/api/invoices -H "Content-Type: application/json" -d "{}"
```

Expected: `422` with the "applicationId, candidateName, position, companyId, and a positive agreedSalary are required." message (confirms validation runs before any DB call).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/invoices/route.ts src/app/api/invoices/[id]/route.ts src/app/api/candidates/[id]/invoice/route.ts
git commit -m "feat(api): add invoice list/create, status update, and per-candidate check routes"
```

---

## Task 6: i18n keys for Billing

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add English keys**

In the `en` block, find `admin_tab_legal:       'Legal',` and add immediately after it:

```typescript
    admin_tab_billing:     'Billing',
```

Find `admin_banner_legal:       ' B2B service contracts and candidate anti-bypass consent tracking.',` and add immediately after it:

```typescript
    admin_banner_billing:     ' Generate and track invoices for placed candidates.',
```

Find `cdw_edit_suffix:        'edit',` and add immediately after it:

```typescript
    cdw_billing_section:              'Billing',
    cdw_final_salary_label:           'Final Agreed Salary (MMK)',
    cdw_final_salary_placeholder:     'e.g. 1500000',
    cdw_select_company:               'Select company…',
    cdw_generate_invoice:             'Generate Invoice',
    cdw_view_invoice:                 'View Invoice',
    cdw_generating:                   'Generating…',
```

- [ ] **Step 2: Add Burmese keys**

In the `my` block, find `admin_tab_legal:       'ဥပဒေရေးရာ',` and add immediately after it:

```typescript
    admin_tab_billing:     'ငွေတောင်းခံလွှာ',
```

Find `admin_banner_legal:       ' B2B စာချုပ်များနှင့် ကိုယ်စားလှယ်လောင်း သဘောတူညီချက် ခြေရာခံမှု။',` and add immediately after it:

```typescript
    admin_banner_billing:     ' ခန့်အပ်ပြီးသော ကိုယ်စားလှယ်လောင်းများအတွက် ငွေတောင်းခံလွှာများ ထုတ်ပေးပြီး ခြေရာခံပါ။',
```

Find `cdw_edit_suffix:        'ပြင်ဆင်ရန်',` and add immediately after it:

```typescript
    cdw_billing_section:              'ငွေတောင်းခံလွှာ',
    cdw_final_salary_label:           'အတည်ပြုလစာ (MMK)',
    cdw_final_salary_placeholder:     'ဥပမာ 1500000',
    cdw_select_company:               'ကုမ္ပဏီ ရွေးချယ်ပါ…',
    cdw_generate_invoice:             'ငွေတောင်းခံလွှာ ထုတ်ရန်',
    cdw_view_invoice:                 'ငွေတောင်းခံလွှာ ကြည့်ရန်',
    cdw_generating:                   'ထုတ်နေသည်…',
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors — `TranslationKey` requires both blocks to define the same key set, so Steps 1–2 must stay in sync.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): add Billing tab and Candidate Drawer billing translations"
```

---

## Task 7: `BillingView.tsx` component

**Files:**
- Create: `src/components/dashboard/BillingView.tsx`

Follows `LegalView.tsx`'s pattern: `useState` + `fetch` in a `useCallback` loader, plain Tailwind table, client-side filtering (matching this codebase's established convention — per `CLAUDE.md`, "All filtering happens client-side"). Internal copy is English-only, same as `LegalView.tsx`'s own justification (this is an internal admin screen, not a candidate-facing or company-facing document).

- [ ] **Step 1: Write the component**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Printer, FileText } from 'lucide-react';
import type { Invoice, InvoiceStatus } from '@/types';

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  Draft:   'bg-muted text-muted-foreground border-border',
  Sent:    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Paid:    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
  Overdue: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30',
};

const STATUSES: InvoiceStatus[] = ['Draft', 'Sent', 'Paid', 'Overdue'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BillingView() {
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter]   = useState<InvoiceStatus | ''>('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [savingId, setSavingId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices');
      if (res.ok) setInvoices(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(id: string, status: InvoiceStatus) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      if (!res.ok) {
        alert('Could not update invoice status. Please try again.');
        return;
      }
      setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status } : inv));
    } finally {
      setSavingId(null);
    }
  }

  const companyNames = Array.from(new Set(invoices.map((inv) => inv.companyName))).sort();
  const filtered = invoices.filter((inv) =>
    (!statusFilter || inv.status === statusFilter) &&
    (!companyFilter || inv.companyName === companyFilter),
  );

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">Invoices</h3>
        <div className="flex gap-2">
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">All companies</option>
            {companyNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <FileText size={36} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No invoices yet. Generate one from a Hired candidate's drawer.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3">Invoice #</th>
                <th className="p-3">Company</th>
                <th className="p-3">Candidate / Position</th>
                <th className="p-3">Fee (MMK)</th>
                <th className="p-3">Status</th>
                <th className="p-3">Issued</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50">
                  <td className="p-3 font-medium text-foreground">{inv.invoiceNumber}</td>
                  <td className="p-3 text-muted-foreground">{inv.companyName}</td>
                  <td className="p-3 text-muted-foreground">{inv.candidateName} · {inv.position}</td>
                  <td className="p-3 text-muted-foreground">{inv.commissionFeeMmk.toLocaleString()}</td>
                  <td className="p-3">
                    <select
                      value={inv.status}
                      onChange={(e) => changeStatus(inv.id, e.target.value as InvoiceStatus)}
                      disabled={savingId === inv.id}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[inv.status]}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="p-3 text-muted-foreground">{fmtDate(inv.issuedAt)}</td>
                  <td className="p-3">
                    <a
                      href={`/dashboard/billing/invoice/${inv.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <Printer size={12} /> Print
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

Note: `changeStatus` checks `res.ok` before applying its optimistic update — this codebase's code review already caught the opposite pattern as a real bug in `LegalView.tsx`'s `saveCommissionRate` during the Legal Docs subsystem, where a failed save silently diverged the UI from the DB.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/BillingView.tsx
git commit -m "feat(dashboard): add BillingView (invoice list, filters, status tracking)"
```

---

## Task 8: Add the "Billing" tab to `DashboardClient.tsx`

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add the tab type, icon import, and nav entry**

Change the `Tab` type from:

```typescript
type Tab = 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies' | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal';
```

to:

```typescript
type Tab = 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies' | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal' | 'billing';
```

Add `Receipt` to the lucide-react import:

```typescript
import { BarChart2, Building2, Landmark, Users, Info, PenSquare, Mail, LayoutGrid, Table2, PlusSquare, Briefcase, ClipboardList, Scale, Receipt } from 'lucide-react';
```

Add the `BillingView` import after the `LegalView` import:

```typescript
import { BillingView } from './BillingView';
```

Add to the `TABS` array, after the `legal` entry:

```typescript
    { value: 'billing',    label: t('admin_tab_billing'),    icon: <Receipt       size={14} /> },
```

- [ ] **Step 2: Add the banner line and tab render**

Add to the context banner's conditional list, after the `legal` line:

```typescript
          {activeTab === 'billing'     && t('admin_banner_billing')}
```

Add to the tab-content render list, after `{activeTab === 'legal' && <LegalView />}`:

```typescript
      {activeTab === 'billing'     && <BillingView />}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (since `BillingView.tsx` already exists from Task 7).

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): wire Billing tab into DashboardClient"
```

---

## Task 9: Candidate Drawer — final salary + invoice generation

**Files:**
- Modify: `src/components/dashboard/CandidateDrawer.tsx`

- [ ] **Step 1: Add state for the billing section**

Add near the existing `interviewEditMode`/`consentData` state block (around line 65-72):

```typescript
  // Billing: final salary editing + invoice generation
  const [finalSalaryEditMode, setFinalSalaryEditMode] = useState(false);
  const [finalSalaryVal,      setFinalSalaryVal]       = useState('');
  const [savingFinalSalary,   setSavingFinalSalary]    = useState(false);
  const [invoiceCompanyId,    setInvoiceCompanyId]     = useState('');
  const [generatingInvoice,   setGeneratingInvoice]    = useState(false);
  const { data: companiesForInvoice = [] } = useSWR<Company[]>(
    candidate && candidate.stage === 'Hired' ? '/api/companies' : null,
    fetcher,
  );
  const { data: invoiceData, mutate: mutateInvoice } = useSWR<{ invoice: Invoice | null }>(
    candidate && candidate.stage === 'Hired' ? `/api/candidates/${candidate.id}/invoice` : null,
    fetcher,
  );
```

Update the type import line at the top of the file from:

```typescript
import type { Candidate, ApplicationStatus, Job } from '@/types';
```

to:

```typescript
import type { Candidate, ApplicationStatus, Job, Company, Invoice } from '@/types';
```

- [ ] **Step 2: Reset the final-salary input when the drawer opens for a new candidate**

In the existing reset `useEffect` (the one that resets `cvUrlValue`, `interviewLocationVal`, etc.), add alongside `setInterviewEditMode(false);`:

```typescript
      setFinalSalaryVal(candidate.finalAgreedSalary != null ? String(candidate.finalAgreedSalary) : '');
      setFinalSalaryEditMode(false);
      setInvoiceCompanyId('');
```

- [ ] **Step 3: Add a best-effort default company match**

Add near the other top-level hooks (after the reset `useEffect`, before the save handlers):

```typescript
  useEffect(() => {
    if (candidate?.company && companiesForInvoice.length > 0 && !invoiceCompanyId) {
      const match = companiesForInvoice.find(
        (c) => c.name.toLowerCase() === candidate.company?.toLowerCase(),
      );
      if (match) setInvoiceCompanyId(match.id);
    }
  }, [candidate, companiesForInvoice, invoiceCompanyId]);
```

This only pre-fills the dropdown when there's an exact (case-insensitive) name match — it never silently generates an invoice against a guessed company. The admin can always change the selection before clicking Generate.

- [ ] **Step 4: Add the save and generate handlers**

Add near the existing `handleSaveInterviewDetails` function:

```typescript
  async function handleSaveFinalSalary() {
    if (!candidate) return;
    const parsed = Number(finalSalaryVal);
    if (!finalSalaryVal || Number.isNaN(parsed) || parsed < 0) return;
    setSavingFinalSalary(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/final-salary`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ finalAgreedSalary: parsed }),
      });
      if (res.ok) {
        globalMutate('/api/candidates');
        setFinalSalaryEditMode(false);
      }
    } catch (err) { console.error('[CandidateDrawer] final salary update error:', err); }
    finally { setSavingFinalSalary(false); }
  }

  async function handleGenerateInvoice() {
    if (!candidate || !candidate.finalAgreedSalary || !invoiceCompanyId) return;
    setGeneratingInvoice(true);
    try {
      const res = await fetch('/api/invoices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          applicationId: candidate.id,
          candidateName: candidate.name,
          position:      candidate.position,
          companyId:     invoiceCompanyId,
          agreedSalary:  candidate.finalAgreedSalary,
        }),
      });
      if (res.ok) {
        mutateInvoice();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? 'Could not generate invoice.');
      }
    } catch (err) {
      console.error('[CandidateDrawer] generate invoice error:', err);
    } finally {
      setGeneratingInvoice(false);
    }
  }
```

- [ ] **Step 5: Render the billing section, gated to the Hired stage**

Add this block right after the Interview Details block (the one gated on `candidate.stage === 'Interview'`) and before the `{candidate.source && (...)}` block:

```typescript
            {candidate.stage === 'Hired' && (
              <div className="space-y-2 px-4 py-3 border-t border-border/50">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t('cdw_billing_section')}</p>

                {finalSalaryEditMode ? (
                  <>
                    <input
                      type="number"
                      value={finalSalaryVal}
                      onChange={(e) => setFinalSalaryVal(e.target.value)}
                      placeholder={t('cdw_final_salary_placeholder')}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveFinalSalary}
                        disabled={savingFinalSalary}
                        className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingFinalSalary ? t('cdw_saving') : t('cdw_save')}
                      </button>
                      <button
                        onClick={() => setFinalSalaryEditMode(false)}
                        className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground"
                      >
                        {t('cdw_cancel')}
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setFinalSalaryEditMode(true)}
                    className="text-left text-xs text-muted-foreground hover:text-foreground"
                  >
                    {candidate.finalAgreedSalary
                      ? <>{t('cdw_final_salary_label')}: {candidate.finalAgreedSalary.toLocaleString()} ({t('cdw_edit_suffix')})</>
                      : t('cdw_final_salary_label')}
                  </button>
                )}

                {candidate.finalAgreedSalary ? (
                  invoiceData?.invoice ? (
                    <a
                      href={`/dashboard/billing/invoice/${invoiceData.invoice.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex w-fit items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                    >
                      {t('cdw_view_invoice')}
                    </a>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <select
                        value={invoiceCompanyId}
                        onChange={(e) => setInvoiceCompanyId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      >
                        <option value="">{t('cdw_select_company')}</option>
                        {companiesForInvoice.map((co) => (
                          <option key={co.id} value={co.id}>{co.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleGenerateInvoice}
                        disabled={!invoiceCompanyId || generatingInvoice}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {generatingInvoice ? t('cdw_generating') : t('cdw_generate_invoice')}
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    disabled
                    title={t('cdw_final_salary_label')}
                    className="mt-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground opacity-60"
                  >
                    {t('cdw_generate_invoice')}
                  </button>
                )}
              </div>
            )}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Run: `npm run dev`, open a Hired candidate's drawer, set a final agreed salary, save, select a company, click "Generate Invoice", confirm the button becomes "View Invoice" and clicking it opens the (not-yet-built, until Task 10) print route.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/CandidateDrawer.tsx
git commit -m "feat(dashboard): add final salary and invoice generation to Candidate Drawer"
```

---

## Task 10: Invoice print route

**Files:**
- Create: `src/components/billing/InvoiceDocument.tsx`
- Create: `src/app/dashboard/billing/invoice/[invoiceId]/print/page.tsx`

Reuses `AutoPrint.tsx` from the Legal Docs subsystem unchanged (it's domain-agnostic — just fires `window.print()` on mount). `InvoiceDocument.tsx` lives in a new `src/components/billing/` directory rather than `src/components/legal/`, since invoices are a distinct domain from legal documents, even though they share the print mechanics.

- [ ] **Step 1: Write the invoice document component**

```typescript
import type { Invoice } from '@/types';

interface Props {
  invoice: Invoice;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function InvoiceDocument({ invoice }: Props) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-black print:p-0">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lion Jobs Agency</h1>
          <p className="text-sm text-gray-600">Recruitment Services Invoice</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">{invoice.invoiceNumber}</p>
          <p className="text-gray-600">Issued: {fmtDate(invoice.issuedAt)}</p>
        </div>
      </div>

      <div className="mb-8">
        <p className="text-xs uppercase text-gray-500">Bill To</p>
        <p className="font-semibold">{invoice.companyName}</p>
      </div>

      <table className="mb-8 w-full text-sm">
        <thead>
          <tr className="border-b border-gray-300 text-left">
            <th className="pb-2">Description</th>
            <th className="pb-2 text-right">Amount (MMK)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="py-3">
              Recruitment commission &mdash; {invoice.candidateName} ({invoice.position})
              <br />
              <span className="text-xs text-gray-500">
                Agreed salary: {invoice.agreedSalary.toLocaleString()} MMK &middot; Commission rate: {invoice.commissionRatePct}%
              </span>
            </td>
            <td className="py-3 text-right">{invoice.commissionFeeMmk.toLocaleString()}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-4 text-right font-semibold">Total Due</td>
            <td className="pt-4 text-right font-semibold">{invoice.commissionFeeMmk.toLocaleString()} MMK</td>
          </tr>
        </tfoot>
      </table>

      <p className="text-xs text-gray-500">Status: {invoice.status}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write the print page (server component)**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect, notFound } from 'next/navigation';
import { getInvoiceById } from '@/lib/db';
import { InvoiceDocument } from '@/components/billing/InvoiceDocument';
import { AutoPrint } from '@/components/legal/AutoPrint';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    redirect('/login');
  }

  const { invoiceId } = await params;
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden p-4">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-sm text-gray-600 hover:text-black">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>
      <InvoiceDocument invoice={invoice} />
      <AutoPrint />
    </div>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run: `npm run dev`, log in as the admin email, open the Billing tab, click "Print" on any invoice row. Expected: a new tab opens showing the invoice with no site nav/footer, and the print dialog opens automatically after ~300ms. Confirm the commission fee equals `agreedSalary * commissionRatePct / 100`, and that both figures shown are the snapshotted values, not live-recomputed ones.

- [ ] **Step 5: Commit**

```bash
git add src/components/billing/InvoiceDocument.tsx src/app/dashboard/billing/invoice/[invoiceId]/print/page.tsx
git commit -m "feat(billing): add printable invoice route"
```

---

## Task 11: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero *new* errors relative to the pre-existing baseline (this project has 14 pre-existing lint errors in files unrelated to Billing — confirm none of them are in files this plan touched, and confirm no new ones were introduced).

- [ ] **Step 3: End-to-end manual walkthrough**

With `npm run dev` running and logged in as the admin email:
1. Move a candidate to Hired stage, open the drawer, set a final agreed salary, save, reload the drawer, confirm it persisted.
2. Select a company (confirm the auto-match pre-fills correctly if the candidate's `company` name matches an existing company exactly; confirm it's blank and requires manual selection otherwise) and click "Generate Invoice".
3. Confirm the button becomes "View Invoice"; click it; confirm the printed invoice shows the correct candidate, position, salary, commission %, and fee.
4. In the Billing tab, confirm the new invoice appears, filter by its company and by "Draft" status, then change its status to "Sent" and confirm the badge updates.
5. Change the company's commission rate override in the Legal tab, then reprint the already-generated invoice — confirm the fee is **unchanged** (proves the snapshot, not a live recompute).
6. Attempt to generate a second invoice for the same candidate from the drawer — confirm the UI never offers a second "Generate" (the invoice-existence check via `GET /api/candidates/{id}/invoice` should already show "View Invoice").

- [ ] **Step 4: Final commit (if any fixes were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during billing subsystem verification"
```

(Skip this step if Step 1-3 passed with no changes needed.)
