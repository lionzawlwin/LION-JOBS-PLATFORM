# Layer 10: Internal-Hiring Tier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mark `companies` rows as `is_internal` (for the repo owner's own F&B brands — Cheesy Bites, Hey U, TTT, Yangon Burger), block invoice creation against them, and keep them out of the client-facing CRM pipeline views by default.

**Architecture:** One additive boolean column (`companies.is_internal`), a pure `isInvoiceableCompany()` predicate shared safely between a server API route and a client component (kept out of `src/lib/db/*` to avoid bundling the Supabase service-role client into the browser), and small additive UI changes to two existing dashboard views (Companies, Enterprise) plus the invoice-creation dropdown in `CandidateDrawer.tsx`.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres, TypeScript, Vitest.

Design spec: `docs/superpowers/specs/2026-07-06-layer10-internal-hiring-tier-design.md`

---

### Task 1: Migration + `Company` type

**Files:**
- Create: `supabase/migrations/0020_add_companies_is_internal.sql`
- Modify: `src/types/index.ts:122-137`

- [ ] **Step 1: Write the migration**

```sql
-- Layer 10: internal-hiring safety/hygiene for the repo owner's own F&B
-- brands (Cheesy Bites, Hey U, TTT, Yangon Burger). Additive, defaulted
-- false for every existing row -- no behavior change for any company
-- that isn't explicitly marked internal. See
-- docs/superpowers/specs/2026-07-06-layer10-internal-hiring-tier-design.md.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 2: Add `isInternal` to the `Company` type**

In `src/types/index.ts`, the `Company` interface currently reads:

```ts
export interface Company {
  id:            string;
  name:          string;
  contactPerson: string;
  email:         string;
  phone:         string;
  industry:      string;
  city:          string;
  status:        CompanyStatus;
  tier:          CompanyTier;
  notes:         string;
  lastContacted: string;
  createdAt:     string;
  commissionRatePct?: number | null;
}
```

Add `isInternal: boolean;` (required, not optional — matches how `status`/`tier` are handled, only `commissionRatePct` is genuinely nullable):

```ts
export interface Company {
  id:            string;
  name:          string;
  contactPerson: string;
  email:         string;
  phone:         string;
  industry:      string;
  city:          string;
  status:        CompanyStatus;
  tier:          CompanyTier;
  notes:         string;
  lastContacted: string;
  createdAt:     string;
  commissionRatePct?: number | null;
  isInternal:    boolean;
}
```

- [ ] **Step 3: Verify the type-check fails (expected — `mapToCompany` doesn't populate it yet)**

Run: `npx tsc --noEmit`
Expected: no error yet, since `isInternal` isn't read anywhere. This step exists to confirm the baseline is clean before Task 2 changes `companies.ts` — skip straight to Task 2 if this passes cleanly.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0020_add_companies_is_internal.sql src/types/index.ts
git commit -m "feat: add companies.is_internal column and Company type field"
```

---

### Task 2: `db/companies.ts` — read/write the new column

**Files:**
- Modify: `src/lib/db/companies.ts:4-22` (`mapToCompany`)
- Modify: `src/lib/db/companies.ts:38-68` (`appendCompany`)
- Modify: `src/lib/db/companies.ts:85-91` (add `updateCompanyIsInternal` after `updateCompanyTier`)

- [ ] **Step 1: Update `mapToCompany` to read the new column**

Current (`src/lib/db/companies.ts:4-22`):

```ts
function mapToCompany(row: Record<string, unknown>): Company {
  return {
    id:            row.id as string,
    name:          row.name as string,
    contactPerson: (row.contact_person as string) ?? '',
    email:         (row.email as string) ?? '',
    phone:         (row.phone as string) ?? '',
    industry:      (row.industry as string) ?? '',
    city:          (row.city as string) ?? '',
    status:        ((row.status as string) ?? 'Lead') as CompanyStatus,
    tier:          ((row.tier as string) ?? 'smb') as CompanyTier,
    notes:         (row.notes as string) ?? '',
    commissionRatePct: row.commission_rate_pct === null || row.commission_rate_pct === undefined
      ? null
      : Number(row.commission_rate_pct),
    lastContacted: (row.last_contacted as string) ?? '',
    createdAt:     row.created_at as string,
  };
}
```

Replace with (adds `isInternal` before the closing brace):

```ts
function mapToCompany(row: Record<string, unknown>): Company {
  return {
    id:            row.id as string,
    name:          row.name as string,
    contactPerson: (row.contact_person as string) ?? '',
    email:         (row.email as string) ?? '',
    phone:         (row.phone as string) ?? '',
    industry:      (row.industry as string) ?? '',
    city:          (row.city as string) ?? '',
    status:        ((row.status as string) ?? 'Lead') as CompanyStatus,
    tier:          ((row.tier as string) ?? 'smb') as CompanyTier,
    notes:         (row.notes as string) ?? '',
    commissionRatePct: row.commission_rate_pct === null || row.commission_rate_pct === undefined
      ? null
      : Number(row.commission_rate_pct),
    lastContacted: (row.last_contacted as string) ?? '',
    createdAt:     row.created_at as string,
    isInternal:    (row.is_internal as boolean) ?? false,
  };
}
```

- [ ] **Step 2: Update `appendCompany` to accept and write `isInternal`**

Current (`src/lib/db/companies.ts:38-68`):

```ts
export async function appendCompany(data: {
  name:           string;
  contactPerson?: string;
  email?:         string;
  phone?:         string;
  industry?:      string;
  city?:          string;
  status?:        string;
  tier?:          string;
  notes?:         string;
  lastContacted?: string;
}): Promise<string> {
  const id = `co-${Date.now()}`;

  const { error } = await supabase.from('companies').insert({
    id,
    name:           data.name,
    contact_person: data.contactPerson ?? null,
    email:          data.email ?? null,
    phone:          data.phone ?? null,
    industry:       data.industry ?? null,
    city:           data.city ?? null,
    status:         data.status ?? 'Lead',
    tier:           data.tier ?? 'smb',
    notes:          data.notes ?? null,
    last_contacted: data.lastContacted ?? null,
  });

  if (error) throw new Error(`Failed to insert company: ${error.message}`);
  return id;
}
```

Replace with:

```ts
export async function appendCompany(data: {
  name:           string;
  contactPerson?: string;
  email?:         string;
  phone?:         string;
  industry?:      string;
  city?:          string;
  status?:        string;
  tier?:          string;
  notes?:         string;
  lastContacted?: string;
  isInternal?:    boolean;
}): Promise<string> {
  const id = `co-${Date.now()}`;

  const { error } = await supabase.from('companies').insert({
    id,
    name:           data.name,
    contact_person: data.contactPerson ?? null,
    email:          data.email ?? null,
    phone:          data.phone ?? null,
    industry:       data.industry ?? null,
    city:           data.city ?? null,
    status:         data.status ?? 'Lead',
    tier:           data.tier ?? 'smb',
    notes:          data.notes ?? null,
    last_contacted: data.lastContacted ?? null,
    is_internal:    data.isInternal ?? false,
  });

  if (error) throw new Error(`Failed to insert company: ${error.message}`);
  return id;
}
```

- [ ] **Step 3: Add `updateCompanyIsInternal`, mirroring `updateCompanyTier`**

Current (`src/lib/db/companies.ts:85-91`):

```ts
export async function updateCompanyTier(id: string, tier: string): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ tier })
    .eq('id', id);
  if (error) throw new Error(`Failed to update company tier: ${error.message}`);
}
```

Add immediately after it:

```ts
export async function updateCompanyIsInternal(id: string, isInternal: boolean): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ is_internal: isInternal })
    .eq('id', id);
  if (error) throw new Error(`Failed to update company internal flag: ${error.message}`);
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/companies.ts
git commit -m "feat: read/write companies.is_internal in db accessor"
```

---

### Task 3: `isInvoiceableCompany` pure predicate (TDD)

**Why a new file, not `db/companies.ts`:** `CandidateDrawer.tsx` (Task 5) is a `'use client'` component. If it imported this check from `src/lib/db/companies.ts`, Next.js would bundle that entire module — including `src/lib/supabase.ts`'s Supabase client, initialized with `SUPABASE_SERVICE_ROLE_KEY` — into the browser bundle. This mirrors how `src/lib/cseScope.ts` already solves the identical problem (a pure predicate imported by both an API route and `EnterpriseView.tsx`, with zero Supabase/server-only imports).

**Files:**
- Create: `src/lib/companyRules.ts`
- Create: `src/lib/companyRules.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { isInvoiceableCompany } from './companyRules';
import type { Company } from '@/types';

function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: 'co1', name: 'Acme', contactPerson: '', email: '', phone: '',
    industry: '', city: '', status: 'Active', tier: 'smb', notes: '',
    lastContacted: '', createdAt: '2026-01-01T00:00:00Z', isInternal: false,
    ...overrides,
  };
}

describe('isInvoiceableCompany', () => {
  it('returns true for a normal (non-internal) company', () => {
    expect(isInvoiceableCompany(makeCompany({ isInternal: false }))).toBe(true);
  });

  it('returns false for an internal company', () => {
    expect(isInvoiceableCompany(makeCompany({ isInternal: true }))).toBe(false);
  });
});
```

Save this as `src/lib/companyRules.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/companyRules.test.ts`
Expected: FAIL — `Cannot find module './companyRules'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `src/lib/companyRules.ts`:

```ts
import type { Company } from '@/types';

// Layer 10: internal companies (the repo owner's own F&B brands) have no
// commercial relationship with the agency -- there's nothing to invoice.
// Single source of truth, used both by POST /api/invoices (the real
// enforcement boundary) and CandidateDrawer.tsx's company picker (so the
// option never appears in the normal flow). Deliberately has zero
// Supabase/server-only imports -- see this file's test/plan for why it
// can't live in src/lib/db/companies.ts.
export function isInvoiceableCompany(company: Company): boolean {
  return !company.isInternal;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/companyRules.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/companyRules.ts src/lib/companyRules.test.ts
git commit -m "feat: add isInvoiceableCompany pure predicate"
```

---

### Task 4: API routes — accept `isInternal`, guard invoice creation

**Files:**
- Modify: `src/app/api/companies/route.ts:24-42` (`POST`)
- Modify: `src/app/api/companies/[id]/route.ts` (`PATCH`)
- Modify: `src/app/api/invoices/route.ts:1-6,63-66` (`POST`)

- [ ] **Step 1: `POST /api/companies` accepts `isInternal`**

Current (`src/app/api/companies/route.ts:24-42`):

```ts
export async function POST(req: NextRequest) {
  if (!(await requireTabAccess('companies', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.email) {
    return Response.json({ error: 'name and email are required.' }, { status: 422 });
  }
  try {
    const id = await appendCompany({
      name:          String(body.name),
      contactPerson: String(body.contactPerson ?? ''),
      email:         String(body.email),
      phone:         String(body.phone ?? ''),
      industry:      String(body.industry ?? 'Other'),
      city:          String(body.city ?? 'Yangon'),
      status:        body.status ?? 'Lead',
      tier:          body.tier ?? 'smb',
      notes:         String(body.notes ?? ''),
    });
    revalidateTag('enterprise-stats', { expire: 0 });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

Replace the `appendCompany({...})` call with:

```ts
    const id = await appendCompany({
      name:          String(body.name),
      contactPerson: String(body.contactPerson ?? ''),
      email:         String(body.email),
      phone:         String(body.phone ?? ''),
      industry:      String(body.industry ?? 'Other'),
      city:          String(body.city ?? 'Yangon'),
      status:        body.status ?? 'Lead',
      tier:          body.tier ?? 'smb',
      notes:         String(body.notes ?? ''),
      isInternal:    body.isInternal === true,
    });
```

- [ ] **Step 2: `PATCH /api/companies/[id]` accepts `isInternal`**

Current (`src/app/api/companies/[id]/route.ts`), full file:

```ts
import { revalidateTag } from 'next/cache';
import { requireTabAccess } from '@/lib/auth';
import { updateCompanyStatus, updateCompanyTier, updateCompanyCommissionRate, deleteCompany } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { CompanyStatus, CompanyTier } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('companies', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?:            CompanyStatus;
    notes?:             string;
    tier?:              CompanyTier;
    commissionRatePct?: number | null;
  };
  if (!body.status && !body.tier && body.commissionRatePct === undefined) {
    return Response.json({ error: 'status, tier, or commissionRatePct is required.' }, { status: 422 });
  }
  if (
    body.commissionRatePct !== undefined && body.commissionRatePct !== null &&
    (typeof body.commissionRatePct !== 'number' || !Number.isFinite(body.commissionRatePct) ||
     body.commissionRatePct < 0 || body.commissionRatePct > 100)
  ) {
    return Response.json({ error: 'commissionRatePct must be a number between 0 and 100.' }, { status: 422 });
  }
  try {
    if (body.status) await updateCompanyStatus(id, body.status, body.notes);
    if (body.tier)   { await updateCompanyTier(id, body.tier); revalidateTag('enterprise-stats', { expire: 0 }); }
    if (body.commissionRatePct !== undefined) await updateCompanyCommissionRate(id, body.commissionRatePct);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

Replace the whole `PATCH` export with:

```ts
import { revalidateTag } from 'next/cache';
import { requireTabAccess } from '@/lib/auth';
import { updateCompanyStatus, updateCompanyTier, updateCompanyCommissionRate, updateCompanyIsInternal, deleteCompany } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { CompanyStatus, CompanyTier } from '@/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('companies', 'manage'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?:            CompanyStatus;
    notes?:             string;
    tier?:              CompanyTier;
    commissionRatePct?: number | null;
    isInternal?:        boolean;
  };
  if (!body.status && !body.tier && body.commissionRatePct === undefined && body.isInternal === undefined) {
    return Response.json({ error: 'status, tier, commissionRatePct, or isInternal is required.' }, { status: 422 });
  }
  if (
    body.commissionRatePct !== undefined && body.commissionRatePct !== null &&
    (typeof body.commissionRatePct !== 'number' || !Number.isFinite(body.commissionRatePct) ||
     body.commissionRatePct < 0 || body.commissionRatePct > 100)
  ) {
    return Response.json({ error: 'commissionRatePct must be a number between 0 and 100.' }, { status: 422 });
  }
  try {
    if (body.status) await updateCompanyStatus(id, body.status, body.notes);
    if (body.tier)   { await updateCompanyTier(id, body.tier); revalidateTag('enterprise-stats', { expire: 0 }); }
    if (body.commissionRatePct !== undefined) await updateCompanyCommissionRate(id, body.commissionRatePct);
    if (body.isInternal !== undefined) await updateCompanyIsInternal(id, body.isInternal);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

(The file's `DELETE` export below this is unchanged — not reproduced here, don't remove it.)

- [ ] **Step 3: `POST /api/invoices` rejects internal companies**

Current (`src/app/api/invoices/route.ts:1-6`):

```ts
import { requireTabAccess } from '@/lib/auth';
import { getInvoices, getInvoiceByApplicationId, createInvoice, getCompanyById, getAgencySettings } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { sendInvoiceIssuedEmail } from '@/lib/portalEmail';
import type { NextRequest } from 'next/server';
import type { InvoiceStatus } from '@/types';
```

Add the new import:

```ts
import { requireTabAccess } from '@/lib/auth';
import { getInvoices, getInvoiceByApplicationId, createInvoice, getCompanyById, getAgencySettings } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { sendInvoiceIssuedEmail } from '@/lib/portalEmail';
import { isInvoiceableCompany } from '@/lib/companyRules';
import type { NextRequest } from 'next/server';
import type { InvoiceStatus } from '@/types';
```

Current (`src/app/api/invoices/route.ts:63-66`):

```ts
  const company = await getCompanyById(companyId);
  if (!company) {
    return Response.json({ error: 'Company not found.' }, { status: 404 });
  }
```

Replace with:

```ts
  const company = await getCompanyById(companyId);
  if (!company) {
    return Response.json({ error: 'Company not found.' }, { status: 404 });
  }
  if (!isInvoiceableCompany(company)) {
    return Response.json({ error: 'Cannot create an invoice for an internal company.' }, { status: 422 });
  }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/companies/route.ts src/app/api/companies/[id]/route.ts src/app/api/invoices/route.ts
git commit -m "feat: accept isInternal in companies API, guard invoice creation"
```

---

### Task 5: `CandidateDrawer.tsx` — hide internal companies from the invoice picker

**Files:**
- Modify: `src/components/dashboard/CandidateDrawer.tsx:1-16` (imports)
- Modify: `src/components/dashboard/CandidateDrawer.tsx:124-131` (auto-match effect)
- Modify: `src/components/dashboard/CandidateDrawer.tsx:658-667` (dropdown render)

- [ ] **Step 1: Import the predicate**

Current (`src/components/dashboard/CandidateDrawer.tsx:12-15`):

```ts
import { cn, timeAgo } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import type { Candidate, ApplicationStatus, Job, Company, Invoice } from '@/types';
```

Add the import:

```ts
import { cn, timeAgo } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';
import type { Candidate, ApplicationStatus, Job, Company, Invoice } from '@/types';
import { isInvoiceableCompany } from '@/lib/companyRules';
```

- [ ] **Step 2: Skip internal companies in the auto-match effect**

Current (`src/components/dashboard/CandidateDrawer.tsx:124-131`):

```ts
  useEffect(() => {
    if (candidate?.company && companiesForInvoice.length > 0 && !invoiceCompanyId) {
      const match = companiesForInvoice.find(
        (c) => c.name.toLowerCase() === candidate.company?.toLowerCase(),
      );
      if (match) setInvoiceCompanyId(match.id);
    }
  }, [candidate, companiesForInvoice, invoiceCompanyId]);
```

Replace with:

```ts
  useEffect(() => {
    if (candidate?.company && companiesForInvoice.length > 0 && !invoiceCompanyId) {
      const match = companiesForInvoice.find(
        (c) => c.name.toLowerCase() === candidate.company?.toLowerCase() && isInvoiceableCompany(c),
      );
      if (match) setInvoiceCompanyId(match.id);
    }
  }, [candidate, companiesForInvoice, invoiceCompanyId]);
```

- [ ] **Step 3: Filter the dropdown options**

Current (`src/components/dashboard/CandidateDrawer.tsx:658-667`):

```tsx
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
```

Replace with:

```tsx
                      <select
                        value={invoiceCompanyId}
                        onChange={(e) => setInvoiceCompanyId(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                      >
                        <option value="">{t('cdw_select_company')}</option>
                        {companiesForInvoice.filter(isInvoiceableCompany).map((co) => (
                          <option key={co.id} value={co.id}>{co.name}</option>
                        ))}
                      </select>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/CandidateDrawer.tsx
git commit -m "feat: hide internal companies from the invoice-creation picker"
```

---

### Task 6: `CompaniesView.tsx` — mark internal, filter them out by default

**Files:**
- Modify: `src/components/dashboard/CompaniesView.tsx`

- [ ] **Step 1: Add `showInternal` state and extend the form's initial state**

Current (`src/components/dashboard/CompaniesView.tsx:29-45`):

```ts
export function CompaniesView() {
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');
  const [emailSending, setEmailSending]       = useState<string | null>(null);
  const [emailType, setEmailType]             = useState<'welcome' | 'outreach'>('welcome');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    industry: 'Technology', city: 'Yangon', status: 'Lead' as CompanyStatus, notes: '',
  });
```

Replace with:

```ts
export function CompaniesView() {
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');
  const [showInternal, setShowInternal]       = useState(false);
  const [emailSending, setEmailSending]       = useState<string | null>(null);
  const [emailType, setEmailType]             = useState<'welcome' | 'outreach'>('welcome');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    industry: 'Technology', city: 'Yangon', status: 'Lead' as CompanyStatus, notes: '',
    isInternal: false,
  });
```

- [ ] **Step 2: Reset `isInternal` after a successful add**

Current (`src/components/dashboard/CompaniesView.tsx:68-72`):

```ts
      if (res.ok) {
        setForm({ name: '', contactPerson: '', email: '', phone: '', industry: 'Technology', city: 'Yangon', status: 'Lead', notes: '' });
        setShowForm(false);
        await load();
      }
```

Replace with:

```ts
      if (res.ok) {
        setForm({ name: '', contactPerson: '', email: '', phone: '', industry: 'Technology', city: 'Yangon', status: 'Lead', notes: '', isInternal: false });
        setShowForm(false);
        await load();
      }
```

- [ ] **Step 3: Add a `toggleInternal` handler**

Add this function immediately after `changeStatus` (`src/components/dashboard/CompaniesView.tsx:78-85`):

```ts
  async function toggleInternal(id: string, isInternal: boolean) {
    await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isInternal }),
    });
    setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, isInternal } : c));
  }
```

- [ ] **Step 4: Extend the `filtered` computation to hide internal companies by default**

Current (`src/components/dashboard/CompaniesView.tsx:121-125`):

```ts
  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    return matchSearch && matchStatus;
  });
```

Replace with:

```ts
  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || c.status === statusFilter;
    const matchInternal = showInternal || !c.isInternal;
    return matchSearch && matchStatus && matchInternal;
  });
```

- [ ] **Step 5: Add the "Show internal" checkbox to the toolbar**

Current (`src/components/dashboard/CompaniesView.tsx:156-163`):

```tsx
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">{t('ent_filter_all_status')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEYS[s])}</option>)}
          </select>
        </div>
```

Replace with (adds the checkbox right after the `</select>`, still inside the same `<div className="flex gap-2">`):

```tsx
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">{t('ent_filter_all_status')}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEYS[s])}</option>)}
          </select>
          <label className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showInternal}
              onChange={(e) => setShowInternal(e.target.checked)}
              className="rounded border-border"
            />
            Show internal
          </label>
        </div>
```

- [ ] **Step 6: Add the "Internal (group brand)" checkbox to the Add Company form**

Current (`src/components/dashboard/CompaniesView.tsx:201-208`):

```tsx
            <input placeholder={t('ent_form_city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">{t('ent_form_cancel')}</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> {t('cv_saving')}</> : t('cv_add_company_btn')}
              </button>
            </div>
```

Replace with (adds the checkbox label between the `notes` input and the button row):

```tsx
            <input placeholder={t('ent_form_city')} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder={t('ent_form_notes')} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isInternal}
                onChange={(e) => setForm({ ...form, isInternal: e.target.checked })}
                className="rounded border-border"
              />
              Internal (group brand) — no invoicing, hidden from the pipeline view by default
            </label>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">{t('ent_form_cancel')}</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> {t('cv_saving')}</> : t('cv_add_company_btn')}
              </button>
            </div>
```

- [ ] **Step 7: Add a per-row toggle badge/button**

Current (`src/components/dashboard/CompaniesView.tsx:235-248`):

```tsx
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Status dropdown */}
                  <div className="relative group">
                    <button className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[co.status])}>
                      {t(STATUS_KEYS[co.status])} <ChevronDown size={10} />
                    </button>
                    <div className="absolute right-0 top-full z-10 mt-1 hidden group-hover:block rounded-xl border border-border bg-card shadow-lg">
                      {STATUSES.map((s) => (
                        <button key={s} onClick={() => changeStatus(co.id, s)} className={cn('block w-full px-4 py-2 text-xs text-left hover:bg-accent first:rounded-t-xl last:rounded-b-xl', s === co.status && 'font-semibold')}>
                          {t(STATUS_KEYS[s])}
                        </button>
                      ))}
                    </div>
                  </div>
```

Replace with (adds the internal toggle button right before the Status dropdown's closing `</div>` of the outer flex container — i.e., insert a new sibling `<button>` immediately after the Status dropdown's `<div className="relative group">...</div>` block, still inside `<div className="flex items-center gap-1.5 shrink-0">`):

```tsx
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Status dropdown */}
                  <div className="relative group">
                    <button className={cn('flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold', STATUS_STYLES[co.status])}>
                      {t(STATUS_KEYS[co.status])} <ChevronDown size={10} />
                    </button>
                    <div className="absolute right-0 top-full z-10 mt-1 hidden group-hover:block rounded-xl border border-border bg-card shadow-lg">
                      {STATUSES.map((s) => (
                        <button key={s} onClick={() => changeStatus(co.id, s)} className={cn('block w-full px-4 py-2 text-xs text-left hover:bg-accent first:rounded-t-xl last:rounded-b-xl', s === co.status && 'font-semibold')}>
                          {t(STATUS_KEYS[s])}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Internal toggle */}
                  <button
                    onClick={() => toggleInternal(co.id, !co.isInternal)}
                    title={co.isInternal ? 'Mark as external client' : 'Mark as internal (group brand)'}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                      co.isInternal
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-300'
                        : 'border-border text-muted-foreground hover:bg-accent',
                    )}
                  >
                    {co.isInternal ? 'Internal' : 'Mark internal'}
                  </button>
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/dashboard/CompaniesView.tsx
git commit -m "feat: mark/filter internal companies in the Companies tab"
```

---

### Task 7: Exclude internal companies from the Enterprise tab, unconditionally

**Files:**
- Modify: `src/hooks/useEnterpriseAccounts.ts:18`

- [ ] **Step 1: Update the `accounts` filter**

Current (`src/hooks/useEnterpriseAccounts.ts:18`):

```ts
  const accounts = (data ?? []).filter((c) => c.tier === 'enterprise');
```

Replace with:

```ts
  // Layer 10: internal companies (the repo owner's own F&B brands) never
  // have a real contract -- excluded unconditionally, no toggle, unlike
  // the Companies tab's opt-in "Show internal" filter. Enterprise is
  // specifically the B2B sales/contract pipeline; there's nothing here
  // for a toggle to ever reveal.
  const accounts = (data ?? []).filter((c) => c.tier === 'enterprise' && !c.isInternal);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useEnterpriseAccounts.ts
git commit -m "feat: exclude internal companies from the Enterprise tab"
```

---

### Task 8: Full verification + apply migration live

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the 2 new `companyRules.test.ts` cases (total should be 68: 66 existing + 2 new).

- [ ] **Step 2: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint the touched files**

Run:
```bash
npx eslint src/types/index.ts src/lib/db/companies.ts src/lib/companyRules.ts src/lib/companyRules.test.ts src/app/api/companies/route.ts "src/app/api/companies/[id]/route.ts" src/app/api/invoices/route.ts src/components/dashboard/CandidateDrawer.tsx src/components/dashboard/CompaniesView.tsx src/hooks/useEnterpriseAccounts.ts
```
Expected: no errors or warnings.

- [ ] **Step 4: Apply the migration to the live Supabase project via MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool against project `gthewuhgrnnabyxkozvv` ("Lion Jobs Agency"), name `add_companies_is_internal`, with the exact SQL from Task 1 Step 1.

- [ ] **Step 5: Verify the column live**

Use `mcp__claude_ai_Supabase__execute_sql` against the same project:

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'companies' AND column_name = 'is_internal';
```

Expected: one row — `is_internal`, `boolean`, `false`, `NO`.

- [ ] **Step 6: Update `supabase/MIGRATIONS.md`**

Add a row to the migration table (matching the existing convention — see the `0016`–`0019` entries for the exact format), and commit:

```bash
git add supabase/MIGRATIONS.md
git commit -m "docs: record 0020_add_companies_is_internal in MIGRATIONS.md"
```

---

## Self-Review Notes (for whoever executes this plan)

- **Spec coverage**: schema (Task 1), safety guard (Tasks 3–4), Companies tab UI (Task 6), Enterprise tab exclusion (Task 7), invoice-picker filtering (Task 5) — all three design-doc sections are covered. Non-goals (Company Portal access, zero-value invoices, group-brand reporting) are correctly not implemented anywhere in this plan.
- **The one real architectural catch**: `isInvoiceableCompany` must live outside `src/lib/db/*` because `CandidateDrawer.tsx` is a client component — documented explicitly in Task 3 rather than left implicit, since getting this wrong would leak the Supabase service-role key into the browser bundle.
- **No route-handler or React-component tests are added**, matching this codebase's existing convention (confirmed via `CLAUDE.md`: only `apiSecurity.ts`, `permissions.ts`, `portalAuth.ts`, `cseScope.ts`, and `algorithmicMatch.ts` have test coverage — all pure-logic files, not routes or components).
