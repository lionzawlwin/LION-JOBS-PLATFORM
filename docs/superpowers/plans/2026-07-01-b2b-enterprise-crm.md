# B2B Enterprise CRM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Enterprise CRM to the dashboard — corporate account tracking (Lead → Active → In-Contract), contract value, structured interaction logs, and CSE (Channel Sales Executive) performance attribution, with revenue visible at a glance.

**Architecture:** Extends the existing `companies` table with `tier`/expanded `status` rather than a parallel table. Adds three new Supabase tables (`contracts`, `interactions`, `cse_reps`) following the existing `src/lib/db/*.ts` one-file-per-table pattern. New `/api/contracts`, `/api/interactions`, `/api/cse`, `/api/enterprise/stats` routes follow the existing `requireAdmin()` Route Handler convention. New `EnterpriseView.tsx` tab in the dashboard follows `CompaniesView.tsx`'s raw-div + Tailwind styling (not shadcn primitives — this codebase's dashboard views don't use them).

**Tech Stack:** Next.js 16 Route Handlers, Supabase (`@supabase/supabase-js`), SWR hooks, next-auth (unchanged — no new auth work), Tailwind v4 with the existing brand/gold token set.

**Testing note:** Per `CLAUDE.md`, this repo has no test suite configured (`npx tsc --noEmit` is the documented verification method). Steps below use type-checking + manual verification (curl / dev server) instead of a TDD red-green cycle, since introducing a test framework is out of scope for this feature.

**Spec:** `docs/superpowers/specs/2026-07-01-b2b-enterprise-crm-design.md`

---

## Task 1: Supabase migration SQL

**Files:**
- Create: `supabase/migrations/add_enterprise_crm.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- B2B Enterprise CRM: companies extension + contracts/interactions/cse_reps
-- Run this in Supabase SQL Editor once.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'smb';

-- Existing 'Client' rows become 'Active' under the expanded status set
-- ('Lead' | 'Active' | 'In-Contract' | 'Inactive').
UPDATE companies SET status = 'Active' WHERE status = 'Client';

CREATE TABLE IF NOT EXISTS cse_reps (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value         NUMERIC NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'MMK',
  contract_type TEXT NOT NULL DEFAULT 'Retainer',
  status        TEXT NOT NULL DEFAULT 'Draft',
  start_date    DATE,
  end_date      DATE,
  cse_id        TEXT REFERENCES cse_reps(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interactions (
  id                TEXT PRIMARY KEY,
  company_id        TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  note              TEXT NOT NULL,
  logged_by_cse_id  TEXT REFERENCES cse_reps(id) ON DELETE SET NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_cse_id ON contracts(cse_id);
CREATE INDEX IF NOT EXISTS idx_interactions_company_id ON interactions(company_id);
```

- [ ] **Step 2: Run it in Supabase**

Open the Supabase project's SQL Editor (same place `add_ai_scoring.sql` was run) and execute the file contents. Verify no errors, and that `companies`, `contracts`, `interactions`, `cse_reps` all show the new columns/tables in the Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/add_enterprise_crm.sql
git commit -m "feat(db): add enterprise CRM schema — companies.tier, contracts, interactions, cse_reps"
```

---

## Task 2: Type definitions

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Update `CompanyStatus`, add `CompanyTier`, add `tier` to `Company`**

Replace lines 112–126 (the existing `CompanyStatus` type and `Company` interface) with:

```typescript
export type CompanyStatus = 'Lead' | 'Active' | 'In-Contract' | 'Inactive';
export type CompanyTier = 'smb' | 'enterprise';

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
}
```

- [ ] **Step 2: Add contract, interaction, CSE, and stats types**

Append to the end of `src/types/index.ts` (after the `ApplicationPayload` interface):

```typescript

export type ContractType = 'Retainer' | 'Contingency' | 'Exclusive' | 'Other';
export type ContractStatus = 'Draft' | 'Active' | 'Completed' | 'Terminated';

export interface Contract {
  id:           string;
  companyId:    string;
  value:        number;
  currency:     string;
  contractType: ContractType;
  status:       ContractStatus;
  startDate:    string | null;
  endDate:      string | null;
  cseId:        string | null;
  notes:        string;
  createdAt:    string;
}

export type InteractionType = 'Call' | 'Email' | 'Meeting' | 'Demo' | 'Contract Sent' | 'Other';

export interface Interaction {
  id:            string;
  companyId:     string;
  type:          InteractionType;
  note:          string;
  loggedByCseId: string | null;
  occurredAt:    string;
  createdAt:     string;
}

export interface CseRep {
  id:        string;
  name:      string;
  phone:     string;
  email:     string;
  active:    boolean;
  createdAt: string;
}

export interface EnterpriseStats {
  totalActiveContractValue: number;
  activeContractsCount:     number;
  enterpriseAccountsCount:  number;
  topCse: { id: string; name: string; value: number } | null;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Errors in `src/lib/db/companies.ts` (missing `tier` in `mapToCompany`) and `src/components/dashboard/CompaniesView.tsx` (`STATUS_STYLES`/`STATUSES` no longer exhaustive over the new `CompanyStatus`). This is expected — those get fixed in Task 6. Confirm there are no *other* unrelated errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): expand CompanyStatus, add tier, contracts, interactions, CSE types"
```

---

## Task 3: DB layer — contracts

**Files:**
- Create: `src/lib/db/contracts.ts`

- [ ] **Step 1: Write the file**

```typescript
import { supabase } from '@/lib/supabase';
import type { Contract, ContractType, ContractStatus } from '@/types';

function mapToContract(row: Record<string, unknown>): Contract {
  return {
    id:           row.id as string,
    companyId:    row.company_id as string,
    value:        Number(row.value ?? 0),
    currency:     (row.currency as string) ?? 'MMK',
    contractType: ((row.contract_type as string) ?? 'Retainer') as ContractType,
    status:       ((row.status as string) ?? 'Draft') as ContractStatus,
    startDate:    (row.start_date as string) ?? null,
    endDate:      (row.end_date as string) ?? null,
    cseId:        (row.cse_id as string) ?? null,
    notes:        (row.notes as string) ?? '',
    createdAt:    row.created_at as string,
  };
}

export async function getContracts(companyId?: string): Promise<Contract[]> {
  let query = supabase.from('contracts').select('*').order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);

  const { data, error } = await query;
  if (error) {
    console.error('[db/contracts] getContracts error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToContract);
}

export async function appendContract(data: {
  companyId:     string;
  value:         number;
  currency?:     string;
  contractType?: string;
  status?:       string;
  startDate?:    string;
  endDate?:      string;
  cseId?:        string;
  notes?:        string;
}): Promise<string> {
  const id = `ct-${Date.now()}`;

  const { error } = await supabase.from('contracts').insert({
    id,
    company_id:    data.companyId,
    value:         data.value,
    currency:      data.currency ?? 'MMK',
    contract_type: data.contractType ?? 'Retainer',
    status:        data.status ?? 'Draft',
    start_date:    data.startDate ?? null,
    end_date:      data.endDate ?? null,
    cse_id:        data.cseId ?? null,
    notes:         data.notes ?? null,
  });

  if (error) throw new Error(`Failed to insert contract: ${error.message}`);
  return id;
}

export async function updateContract(
  id: string,
  data: Partial<{
    value:        number;
    currency:     string;
    contractType: string;
    status:       string;
    startDate:    string;
    endDate:      string;
    cseId:        string;
    notes:        string;
  }>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.value        !== undefined) update.value = data.value;
  if (data.currency     !== undefined) update.currency = data.currency;
  if (data.contractType !== undefined) update.contract_type = data.contractType;
  if (data.status       !== undefined) update.status = data.status;
  if (data.startDate    !== undefined) update.start_date = data.startDate;
  if (data.endDate      !== undefined) update.end_date = data.endDate;
  if (data.cseId        !== undefined) update.cse_id = data.cseId;
  if (data.notes        !== undefined) update.notes = data.notes;

  const { error } = await supabase.from('contracts').update(update).eq('id', id);
  if (error) throw new Error(`Failed to update contract: ${error.message}`);
}

export async function deleteContract(id: string): Promise<void> {
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete contract: ${error.message}`);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors introduced by this file (the pre-existing Task 2 errors are unrelated and still expected at this point).

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/contracts.ts
git commit -m "feat(db): add contracts table CRUD"
```

---

## Task 4: DB layer — interactions

**Files:**
- Create: `src/lib/db/interactions.ts`

- [ ] **Step 1: Write the file**

```typescript
import { supabase } from '@/lib/supabase';
import type { Interaction, InteractionType } from '@/types';

function mapToInteraction(row: Record<string, unknown>): Interaction {
  return {
    id:            row.id as string,
    companyId:     row.company_id as string,
    type:          ((row.type as string) ?? 'Other') as InteractionType,
    note:          (row.note as string) ?? '',
    loggedByCseId: (row.logged_by_cse_id as string) ?? null,
    occurredAt:    row.occurred_at as string,
    createdAt:     row.created_at as string,
  };
}

export async function getInteractions(companyId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('company_id', companyId)
    .order('occurred_at', { ascending: false });

  if (error) {
    console.error('[db/interactions] getInteractions error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToInteraction);
}

export async function appendInteraction(data: {
  companyId:      string;
  type:           string;
  note:           string;
  loggedByCseId?: string;
  occurredAt?:    string;
}): Promise<string> {
  const id = `in-${Date.now()}`;

  const { error } = await supabase.from('interactions').insert({
    id,
    company_id:       data.companyId,
    type:             data.type,
    note:             data.note,
    logged_by_cse_id: data.loggedByCseId ?? null,
    occurred_at:      data.occurredAt ?? new Date().toISOString(),
  });

  if (error) throw new Error(`Failed to insert interaction: ${error.message}`);
  return id;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/interactions.ts
git commit -m "feat(db): add interactions table (append-only activity log)"
```

---

## Task 5: DB layer — CSE reps

**Files:**
- Create: `src/lib/db/cse.ts`

- [ ] **Step 1: Write the file**

```typescript
import { supabase } from '@/lib/supabase';
import type { CseRep } from '@/types';

function mapToCseRep(row: Record<string, unknown>): CseRep {
  return {
    id:        row.id as string,
    name:      row.name as string,
    phone:     (row.phone as string) ?? '',
    email:     (row.email as string) ?? '',
    active:    (row.active as boolean) ?? true,
    createdAt: row.created_at as string,
  };
}

export async function getCseReps(): Promise<CseRep[]> {
  const { data, error } = await supabase
    .from('cse_reps')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('[db/cse] getCseReps error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToCseRep);
}

export async function appendCseRep(data: {
  name:   string;
  phone?: string;
  email?: string;
}): Promise<string> {
  const id = `cse-${Date.now()}`;

  const { error } = await supabase.from('cse_reps').insert({
    id,
    name:   data.name,
    phone:  data.phone ?? null,
    email:  data.email ?? null,
    active: true,
  });

  if (error) throw new Error(`Failed to insert CSE: ${error.message}`);
  return id;
}

export async function updateCseRep(
  id: string,
  data: Partial<{ name: string; phone: string; email: string; active: boolean }>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.name   !== undefined) update.name = data.name;
  if (data.phone  !== undefined) update.phone = data.phone;
  if (data.email  !== undefined) update.email = data.email;
  if (data.active !== undefined) update.active = data.active;

  const { error } = await supabase.from('cse_reps').update(update).eq('id', id);
  if (error) throw new Error(`Failed to update CSE: ${error.message}`);
}

export async function deleteCseRep(id: string): Promise<void> {
  const { error } = await supabase.from('cse_reps').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete CSE: ${error.message}`);
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/cse.ts
git commit -m "feat(db): add cse_reps table CRUD"
```

---

## Task 6: DB layer — companies tier support, enterprise stats, barrel export

**Files:**
- Modify: `src/lib/db/companies.ts`
- Create: `src/lib/db/enterpriseStats.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Add `tier` to `mapToCompany` and `appendCompany`, add `updateCompanyTier`**

In `src/lib/db/companies.ts`, replace the full file contents with:

```typescript
import { supabase } from '@/lib/supabase';
import type { Company, CompanyStatus, CompanyTier } from '@/types';

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
    lastContacted: (row.last_contacted as string) ?? '',
    createdAt:     row.created_at as string,
  };
}

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db/companies] getCompanies error:', error.message);
    return [];
  }

  return (data ?? []).map(mapToCompany);
}

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

export async function updateCompanyStatus(
  id: string,
  status: string,
  notes?: string,
): Promise<void> {
  const update: Record<string, string> = { status };
  if (notes !== undefined) update.notes = notes;

  const { error } = await supabase
    .from('companies')
    .update(update)
    .eq('id', id);
  if (error) throw new Error(`Failed to update company status: ${error.message}`);
}

export async function updateCompanyTier(id: string, tier: string): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ tier })
    .eq('id', id);
  if (error) throw new Error(`Failed to update company tier: ${error.message}`);
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from('companies').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete company: ${error.message}`);
}
```

- [ ] **Step 2: Write the enterprise stats aggregation**

Create `src/lib/db/enterpriseStats.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import type { EnterpriseStats } from '@/types';

export async function getEnterpriseStats(): Promise<EnterpriseStats> {
  const [contractsRes, companiesRes, cseRes] = await Promise.all([
    supabase.from('contracts').select('value, cse_id').eq('status', 'Active'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('tier', 'enterprise'),
    supabase.from('cse_reps').select('id, name'),
  ]);

  if (contractsRes.error) console.error('[db/enterpriseStats] contracts error:', contractsRes.error.message);
  if (companiesRes.error) console.error('[db/enterpriseStats] companies error:', companiesRes.error.message);
  if (cseRes.error) console.error('[db/enterpriseStats] cse error:', cseRes.error.message);

  const activeContracts = contractsRes.data ?? [];
  const cseNameById = new Map(
    (cseRes.data ?? []).map((c) => [c.id as string, c.name as string]),
  );

  const totalActiveContractValue = activeContracts.reduce(
    (sum, c) => sum + Number(c.value ?? 0), 0,
  );
  const activeContractsCount = activeContracts.length;
  const enterpriseAccountsCount = companiesRes.count ?? 0;

  const valueByCse = new Map<string, number>();
  for (const c of activeContracts) {
    const cseId = c.cse_id as string | null;
    if (!cseId) continue;
    valueByCse.set(cseId, (valueByCse.get(cseId) ?? 0) + Number(c.value ?? 0));
  }

  let topCse: EnterpriseStats['topCse'] = null;
  for (const [id, value] of valueByCse) {
    if (!topCse || value > topCse.value) {
      topCse = { id, name: cseNameById.get(id) ?? 'Unknown', value };
    }
  }

  return { totalActiveContractValue, activeContractsCount, enterpriseAccountsCount, topCse };
}
```

- [ ] **Step 3: Add both to the barrel export**

Replace `src/lib/db/index.ts` contents with:

```typescript
export * from './jobs';
export * from './candidates';
export * from './companies';
export * from './leads';
export * from './subscribers';
export * from './feedback';
export * from './contracts';
export * from './interactions';
export * from './cse';
export * from './enterpriseStats';
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: The `companies.ts`-related error from Task 2 is now gone. The `CompaniesView.tsx` `STATUS_STYLES`/`STATUSES` exhaustiveness error from Task 2 is still expected (fixed in Task 14).

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/companies.ts src/lib/db/enterpriseStats.ts src/lib/db/index.ts
git commit -m "feat(db): add tier support to companies, enterprise stats aggregation"
```

---

## Task 7: API route — extend `/api/companies` for tier

**Files:**
- Modify: `src/app/api/companies/route.ts`
- Modify: `src/app/api/companies/[id]/route.ts`

- [ ] **Step 1: Accept `tier` on POST**

In `src/app/api/companies/route.ts`, replace the `POST` function body's `appendCompany` call:

```typescript
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
```

- [ ] **Step 2: Accept `tier` on PATCH**

Replace the full contents of `src/app/api/companies/[id]/route.ts` with:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCompanyStatus, updateCompanyTier, deleteCompany } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { CompanyStatus, CompanyTier } from '@/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?: CompanyStatus;
    notes?:  string;
    tier?:   CompanyTier;
  };
  if (!body.status && !body.tier) {
    return Response.json({ error: 'status or tier is required.' }, { status: 422 });
  }
  try {
    if (body.status) await updateCompanyStatus(id, body.status, body.notes);
    if (body.tier)   await updateCompanyTier(id, body.tier);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteCompany(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/companies/route.ts src/app/api/companies/[id]/route.ts
git commit -m "feat(api): accept tier on company create/update"
```

---

## Task 8: API routes — contracts

**Files:**
- Create: `src/app/api/contracts/route.ts`
- Create: `src/app/api/contracts/[id]/route.ts`

- [ ] **Step 1: Write the collection route**

Create `src/app/api/contracts/route.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getContracts, appendContract } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && session.user?.email === ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get('company_id') ?? undefined;
  const contracts = await getContracts(companyId);
  return Response.json(contracts, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.companyId || body?.value === undefined) {
    return Response.json({ error: 'companyId and value are required.' }, { status: 422 });
  }
  try {
    const id = await appendContract({
      companyId:    String(body.companyId),
      value:        Number(body.value),
      currency:     body.currency     !== undefined ? String(body.currency) : undefined,
      contractType: body.contractType !== undefined ? String(body.contractType) : undefined,
      status:       body.status       !== undefined ? String(body.status) : undefined,
      startDate:    body.startDate    !== undefined ? String(body.startDate) : undefined,
      endDate:      body.endDate      !== undefined ? String(body.endDate) : undefined,
      cseId:        body.cseId        !== undefined ? String(body.cseId) : undefined,
      notes:        body.notes        !== undefined ? String(body.notes) : undefined,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Write the single-resource route**

Create `src/app/api/contracts/[id]/route.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateContract, deleteContract } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    await updateContract(id, {
      value:        body.value        !== undefined ? Number(body.value) : undefined,
      currency:     body.currency     !== undefined ? String(body.currency) : undefined,
      contractType: body.contractType !== undefined ? String(body.contractType) : undefined,
      status:       body.status       !== undefined ? String(body.status) : undefined,
      startDate:    body.startDate    !== undefined ? String(body.startDate) : undefined,
      endDate:      body.endDate      !== undefined ? String(body.endDate) : undefined,
      cseId:        body.cseId        !== undefined ? String(body.cseId) : undefined,
      notes:        body.notes        !== undefined ? String(body.notes) : undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteContract(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/contracts/
git commit -m "feat(api): add contracts CRUD routes"
```

---

## Task 9: API route — interactions

**Files:**
- Create: `src/app/api/interactions/route.ts`

- [ ] **Step 1: Write the file**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getInteractions, appendInteraction } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && session.user?.email === ADMIN_EMAIL;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get('company_id');
  if (!companyId) {
    return Response.json({ error: 'company_id query param is required.' }, { status: 422 });
  }
  const interactions = await getInteractions(companyId);
  return Response.json(interactions, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.companyId || !body?.type || !body?.note) {
    return Response.json({ error: 'companyId, type, and note are required.' }, { status: 422 });
  }
  try {
    const id = await appendInteraction({
      companyId:     String(body.companyId),
      type:          String(body.type),
      note:          String(body.note),
      loggedByCseId: body.loggedByCseId !== undefined ? String(body.loggedByCseId) : undefined,
      occurredAt:    body.occurredAt    !== undefined ? String(body.occurredAt) : undefined,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/interactions/
git commit -m "feat(api): add interactions log route (append-only)"
```

---

## Task 10: API routes — CSE reps

**Files:**
- Create: `src/app/api/cse/route.ts`
- Create: `src/app/api/cse/[id]/route.ts`

- [ ] **Step 1: Write the collection route**

Create `src/app/api/cse/route.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getCseReps, appendCseRep } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return !!session && session.user?.email === ADMIN_EMAIL;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const reps = await getCseReps();
  return Response.json(reps, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return Response.json({ error: 'name is required.' }, { status: 422 });
  }
  try {
    const id = await appendCseRep({
      name:  String(body.name),
      phone: body.phone !== undefined ? String(body.phone) : undefined,
      email: body.email !== undefined ? String(body.email) : undefined,
    });
    return Response.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Write the single-resource route**

Create `src/app/api/cse/[id]/route.ts`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCseRep, deleteCseRep } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  try {
    await updateCseRep(id, {
      name:   body.name   !== undefined ? String(body.name) : undefined,
      phone:  body.phone  !== undefined ? String(body.phone) : undefined,
      email:  body.email  !== undefined ? String(body.email) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await deleteCseRep(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cse/
git commit -m "feat(api): add CSE reps CRUD routes"
```

---

## Task 11: API route — enterprise stats

**Files:**
- Create: `src/app/api/enterprise/stats/route.ts`

- [ ] **Step 1: Write the file**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getEnterpriseStats } from '@/lib/db';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const stats = await getEnterpriseStats();
  return Response.json(stats, { headers: { 'Cache-Control': 'no-store' } });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from this file. This is a good point to confirm the *entire* API/DB layer compiles clean — the only remaining expected error at this point is `CompaniesView.tsx`'s status exhaustiveness (fixed in Task 14).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/enterprise/
git commit -m "feat(api): add enterprise stats aggregation route"
```

---

## Task 12: Hooks — accounts and stats

**Files:**
- Create: `src/hooks/useEnterpriseAccounts.ts`
- Create: `src/hooks/useEnterpriseStats.ts`

- [ ] **Step 1: Write the accounts hook**

```typescript
'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { Company, CompanyStatus, CompanyTier } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useEnterpriseAccounts() {
  const { data, error, isLoading, mutate } = useSWR<Company[]>(
    '/api/companies',
    fetcher,
    { revalidateOnFocus: false },
  );

  const accounts = (data ?? []).filter((c) => c.tier === 'enterprise');

  async function updateStatus(id: string, status: CompanyStatus) {
    const prev = data ?? [];
    const next = prev.map((c) => (c.id === id ? { ...c, status } : c));
    mutate(next, false);

    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success('Account status updated');
    } catch {
      mutate(prev, false);
      toast.error('Failed to update status', { description: 'Please try again.' });
    }
  }

  async function addAccount(input: {
    name: string;
    contactPerson?: string;
    email: string;
    phone?: string;
    industry?: string;
    city?: string;
    notes?: string;
  }) {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        tier: 'enterprise' as CompanyTier,
        status: 'Lead' as CompanyStatus,
      }),
    });
    if (!res.ok) {
      toast.error('Failed to add account');
      return false;
    }
    await mutate();
    toast.success(`${input.name} added`);
    return true;
  }

  return {
    accounts,
    loading: isLoading,
    error: error ? 'Failed to load enterprise accounts.' : null,
    updateStatus,
    addAccount,
    mutate,
  };
}
```

- [ ] **Step 2: Write the stats hook**

```typescript
'use client';

import useSWR from 'swr';
import type { EnterpriseStats } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EMPTY_STATS: EnterpriseStats = {
  totalActiveContractValue: 0,
  activeContractsCount: 0,
  enterpriseAccountsCount: 0,
  topCse: null,
};

export function useEnterpriseStats() {
  const { data, error, isLoading, mutate } = useSWR<EnterpriseStats>(
    '/api/enterprise/stats',
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    stats: data ?? EMPTY_STATS,
    loading: isLoading,
    error: error ? 'Failed to load enterprise stats.' : null,
    mutate,
  };
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from these two files.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useEnterpriseAccounts.ts src/hooks/useEnterpriseStats.ts
git commit -m "feat(hooks): add useEnterpriseAccounts, useEnterpriseStats"
```

---

## Task 13: Hooks — contracts, interactions, CSE reps

**Files:**
- Create: `src/hooks/useContracts.ts`
- Create: `src/hooks/useInteractions.ts`
- Create: `src/hooks/useCseReps.ts`

- [ ] **Step 1: Write the contracts hook**

```typescript
'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { Contract } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useContracts(companyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Contract[]>(
    `/api/contracts?company_id=${companyId}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  async function addContract(input: {
    companyId:     string;
    value:         number;
    currency?:     string;
    contractType?: string;
    status?:       string;
    startDate?:    string;
    endDate?:      string;
    cseId?:        string;
    notes?:        string;
  }) {
    const res = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      toast.error('Failed to add contract');
      return false;
    }
    await mutate();
    toast.success('Contract added');
    return true;
  }

  async function updateContract(id: string, update: Partial<Contract>) {
    const res = await fetch(`/api/contracts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      toast.error('Failed to update contract');
      return false;
    }
    await mutate();
    return true;
  }

  return {
    contracts: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load contracts.' : null,
    addContract,
    updateContract,
    mutate,
  };
}
```

- [ ] **Step 2: Write the interactions hook**

```typescript
'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { Interaction } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInteractions(companyId: string) {
  const { data, error, isLoading, mutate } = useSWR<Interaction[]>(
    `/api/interactions?company_id=${companyId}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  async function logInteraction(input: {
    companyId:      string;
    type:           string;
    note:           string;
    loggedByCseId?: string;
  }) {
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      toast.error('Failed to log interaction');
      return false;
    }
    await mutate();
    toast.success('Interaction logged');
    return true;
  }

  return {
    interactions: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load interactions.' : null,
    logInteraction,
    mutate,
  };
}
```

- [ ] **Step 3: Write the CSE reps hook**

```typescript
'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import type { CseRep } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useCseReps() {
  const { data, error, isLoading, mutate } = useSWR<CseRep[]>(
    '/api/cse',
    fetcher,
    { revalidateOnFocus: false },
  );

  async function addCse(input: { name: string; phone?: string; email?: string }) {
    const res = await fetch('/api/cse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      toast.error('Failed to add CSE');
      return false;
    }
    await mutate();
    toast.success(`${input.name} added`);
    return true;
  }

  async function updateCse(id: string, update: Partial<CseRep>) {
    const res = await fetch(`/api/cse/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      toast.error('Failed to update CSE');
      return false;
    }
    await mutate();
    return true;
  }

  async function deleteCse(id: string) {
    const res = await fetch(`/api/cse/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Failed to delete CSE');
      return false;
    }
    await mutate();
    toast.success('CSE removed');
    return true;
  }

  return {
    cseReps: data ?? [],
    loading: isLoading,
    error: error ? 'Failed to load CSE reps.' : null,
    addCse,
    updateCse,
    deleteCse,
    mutate,
  };
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from these three files.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useContracts.ts src/hooks/useInteractions.ts src/hooks/useCseReps.ts
git commit -m "feat(hooks): add useContracts, useInteractions, useCseReps"
```

---

## Task 14: Fix `CompaniesView.tsx` for the expanded `CompanyStatus`

**Files:**
- Modify: `src/components/dashboard/CompaniesView.tsx`

The existing `STATUS_STYLES` and `STATUSES` constants in this file are keyed on the old 3-value `CompanyStatus`. This is the pre-existing error flagged since Task 2 — fix it now so the whole codebase compiles clean before building new UI.

- [ ] **Step 1: Update the status map and list**

Replace lines 8–14 of `src/components/dashboard/CompaniesView.tsx`:

```typescript
const STATUS_STYLES: Record<CompanyStatus, string> = {
  Lead:          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Active:        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
  'In-Contract': 'bg-gold-50 text-gold-700 border-gold-200 dark:bg-gold-600/20 dark:text-gold-400 dark:border-gold-600/40',
  Inactive:      'bg-muted text-muted-foreground border-border',
};

const STATUSES: CompanyStatus[] = ['Lead', 'Active', 'In-Contract', 'Inactive'];
```

- [ ] **Step 2: Update the stats calculation** (this view's "Active Clients" stat previously counted `status === 'Client'`, which no longer exists)

Replace line 114:

```typescript
  const stats = { total: companies.length, leads: companies.filter((c) => c.status === 'Lead').length, clients: companies.filter((c) => c.status === 'Active' || c.status === 'In-Contract').length };
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Zero errors anywhere in the project. This is the first fully-clean compile since Task 2.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/CompaniesView.tsx
git commit -m "fix(dashboard): update CompaniesView for expanded CompanyStatus set"
```

---

## Task 15: `EnterpriseAccountRow` component

**Files:**
- Create: `src/components/dashboard/EnterpriseAccountRow.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useContracts } from '@/hooks/useContracts';
import { useInteractions } from '@/hooks/useInteractions';
import type {
  Company,
  CompanyStatus,
  CseRep,
  ContractType,
  ContractStatus,
  InteractionType,
} from '@/types';

const STATUS_STYLES: Record<CompanyStatus, string> = {
  Lead:          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
  Active:        'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-900/30 dark:text-brand-200 dark:border-brand-700/40',
  'In-Contract': 'bg-gold-50 text-gold-700 border-gold-200 dark:bg-gold-600/20 dark:text-gold-400 dark:border-gold-600/40',
  Inactive:      'bg-muted text-muted-foreground border-border',
};
const STATUSES: CompanyStatus[] = ['Lead', 'Active', 'In-Contract', 'Inactive'];
const CONTRACT_TYPES: ContractType[] = ['Retainer', 'Contingency', 'Exclusive', 'Other'];
const CONTRACT_STATUSES: ContractStatus[] = ['Draft', 'Active', 'Completed', 'Terminated'];
const INTERACTION_TYPES: InteractionType[] = ['Call', 'Email', 'Meeting', 'Demo', 'Contract Sent', 'Other'];

interface Props {
  company: Company;
  cseReps: CseRep[];
  onStatusChange: (id: string, status: CompanyStatus) => void;
}

export function EnterpriseAccountRow({ company, cseReps, onStatusChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { contracts, addContract, updateContract } = useContracts(company.id);
  const { interactions, logInteraction } = useInteractions(company.id);

  const [contractForm, setContractForm] = useState({
    value: '', contractType: 'Retainer' as ContractType, cseId: '',
  });
  const [savingContract, setSavingContract] = useState(false);
  const [interactionForm, setInteractionForm] = useState({
    type: 'Call' as InteractionType, note: '',
  });
  const [savingInteraction, setSavingInteraction] = useState(false);

  const activeContracts = contracts.filter((c) => c.status === 'Active');
  const activeValue = activeContracts.reduce((sum, c) => sum + c.value, 0);
  const activeCurrency = activeContracts[0]?.currency ?? 'MMK';
  const lastContact = interactions[0]?.occurredAt ?? null;
  const assignedCseId = activeContracts.find((c) => c.cseId)?.cseId ?? null;
  const assignedCseName = cseReps.find((r) => r.id === assignedCseId)?.name ?? '—';

  async function handleAddContract(e: React.FormEvent) {
    e.preventDefault();
    if (!contractForm.value) return;
    setSavingContract(true);
    try {
      const ok = await addContract({
        companyId: company.id,
        value: Number(contractForm.value),
        contractType: contractForm.contractType,
        cseId: contractForm.cseId || undefined,
        status: 'Active',
      });
      if (ok) setContractForm({ value: '', contractType: 'Retainer', cseId: '' });
    } finally {
      setSavingContract(false);
    }
  }

  async function handleLogInteraction(e: React.FormEvent) {
    e.preventDefault();
    if (!interactionForm.note) return;
    setSavingInteraction(true);
    try {
      const ok = await logInteraction({
        companyId: company.id,
        type: interactionForm.type,
        note: interactionForm.note,
      });
      if (ok) setInteractionForm({ type: 'Call', note: '' });
    } finally {
      setSavingInteraction(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white font-bold text-sm">
            {company.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">{company.name}</p>
            <p className="text-xs text-muted-foreground">{assignedCseName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0 text-xs">
          <span className={cn('rounded-full border px-2.5 py-1 font-semibold', STATUS_STYLES[company.status])}>
            {company.status}
          </span>
          <span className="w-24 text-right font-semibold text-foreground">
            {activeValue > 0 ? `${activeValue.toLocaleString()} ${activeCurrency}` : '—'}
          </span>
          <span className="w-20 text-right text-muted-foreground hidden sm:inline">
            {lastContact ? new Date(lastContact).toLocaleDateString() : 'No contact'}
          </span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-5 bg-muted/20">
          {/* Status change */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Status:</span>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onStatusChange(company.id, s)}
                className={cn(
                  'rounded-full border px-2.5 py-1 font-semibold transition-colors',
                  s === company.status ? STATUS_STYLES[s] : 'border-border text-muted-foreground hover:bg-accent',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Contracts */}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Contracts</h4>
            <div className="space-y-1.5">
              {contracts.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No contracts yet.</p>
              )}
              {contracts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs"
                >
                  <span className="font-medium">
                    {c.contractType} · {c.value.toLocaleString()} {c.currency}
                  </span>
                  <select
                    value={c.status}
                    onChange={(e) => updateContract(c.id, { status: e.target.value as ContractStatus })}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                  >
                    {CONTRACT_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddContract} className="mt-2 flex flex-wrap gap-2">
              <input
                type="number"
                min="0"
                placeholder="Value"
                value={contractForm.value}
                onChange={(e) => setContractForm({ ...contractForm, value: e.target.value })}
                className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              />
              <select
                value={contractForm.contractType}
                onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value as ContractType })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={contractForm.cseId}
                onChange={(e) => setContractForm({ ...contractForm, cseId: e.target.value })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                <option value="">Unassigned CSE</option>
                {cseReps.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={savingContract}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingContract ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add Contract
              </button>
            </form>
          </div>

          {/* Interactions */}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Interaction Log</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {interactions.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No interactions logged yet.</p>
              )}
              {interactions.map((i) => (
                <div key={i.id} className="rounded-xl border border-border bg-background px-3 py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{i.type}</span>
                    <span className="text-muted-foreground">
                      {new Date(i.occurredAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{i.note}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleLogInteraction} className="mt-2 flex flex-wrap gap-2">
              <select
                value={interactionForm.type}
                onChange={(e) => setInteractionForm({ ...interactionForm, type: e.target.value as InteractionType })}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              >
                {INTERACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Note…"
                value={interactionForm.note}
                onChange={(e) => setInteractionForm({ ...interactionForm, note: e.target.value })}
                className="flex-1 min-w-[140px] rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={savingInteraction}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {savingInteraction ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Log
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/EnterpriseAccountRow.tsx
git commit -m "feat(dashboard): add EnterpriseAccountRow (contracts + interaction log)"
```

---

## Task 16: `ManageCseModal` component

**Files:**
- Create: `src/components/dashboard/ManageCseModal.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client';

import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useCseReps } from '@/hooks/useCseReps';

interface Props {
  onClose: () => void;
}

export function ManageCseModal({ onClose }: Props) {
  const { cseReps, addCse, deleteCse, loading } = useCseReps();
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setSaving(true);
    try {
      const ok = await addCse(form);
      if (ok) setForm({ name: '', phone: '', email: '' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Manage CSEs</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleAdd} className="mb-4 flex flex-wrap gap-2">
          <input
            required
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="flex-1 min-w-[100px] rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </form>

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!loading && cseReps.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No CSEs yet.</p>
          )}
          {cseReps.map((rep) => (
            <div
              key={rep.id}
              className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <span>{rep.name}{rep.phone ? ` · ${rep.phone}` : ''}</span>
              <button onClick={() => deleteCse(rep.id)} className="text-red-400 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ManageCseModal.tsx
git commit -m "feat(dashboard): add ManageCseModal for CSE roster CRUD"
```

---

## Task 17: `EnterpriseView` component (KPI strip + account table)

**Files:**
- Create: `src/components/dashboard/EnterpriseView.tsx`

- [ ] **Step 1: Write the file**

```tsx
'use client';

import { useState } from 'react';
import { Plus, Building2, Loader2, Users2 } from 'lucide-react';
import { useEnterpriseAccounts } from '@/hooks/useEnterpriseAccounts';
import { useEnterpriseStats } from '@/hooks/useEnterpriseStats';
import { useCseReps } from '@/hooks/useCseReps';
import { EnterpriseAccountRow } from './EnterpriseAccountRow';
import { ManageCseModal } from './ManageCseModal';
import type { CompanyStatus } from '@/types';

const STATUSES: CompanyStatus[] = ['Lead', 'Active', 'In-Contract', 'Inactive'];
const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Education', 'Hospitality', 'Construction', 'Media', 'NGO', 'Other'];

export function EnterpriseView() {
  const { accounts, loading, updateStatus, addAccount } = useEnterpriseAccounts();
  const { stats } = useEnterpriseStats();
  const { cseReps } = useCseReps();

  const [statusFilter, setStatusFilter] = useState<CompanyStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [showCseModal, setShowCseModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    industry: 'Technology', city: 'Yangon', notes: '',
  });

  const filtered = accounts.filter((a) => !statusFilter || a.status === statusFilter);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const ok = await addAccount(form);
      if (ok) {
        setForm({ name: '', contactPerson: '', email: '', phone: '', industry: 'Technology', city: 'Yangon', notes: '' });
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gold-200 bg-gradient-to-br from-gold-50 to-transparent p-5 shadow-sm dark:border-gold-600/30 dark:from-gold-500/10">
          <p className="text-xs font-medium text-muted-foreground">Total Active Contract Value</p>
          <p className="mt-1 text-2xl font-bold text-gold-700 dark:text-gold-400">
            {stats.totalActiveContractValue.toLocaleString()} MMK
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Active Contracts</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.activeContractsCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Enterprise Accounts</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.enterpriseAccountsCount}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Top CSE</p>
          <p className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-200 truncate">
            {stats.topCse ? stats.topCse.name : '—'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CompanyStatus | '')}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
        >
          <option value="">All Status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCseModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Users2 size={15} /> Manage CSEs
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            <Plus size={15} /> Add Enterprise Account
          </button>
        </div>
      </div>

      {/* Add Account form */}
      {showForm && (
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-5 dark:border-brand-700/30 dark:bg-brand-600/5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Add Enterprise Account</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="Company Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder="Contact Person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input required type="email" placeholder="Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600">
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="sm:col-span-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600" />
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 size={36} className="text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {statusFilter ? 'No accounts match this filter.' : 'No enterprise accounts yet. Add your first one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((account) => (
            <EnterpriseAccountRow
              key={account.id}
              company={account}
              cseReps={cseReps}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      )}

      {showCseModal && <ManageCseModal onClose={() => setShowCseModal(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/EnterpriseView.tsx
git commit -m "feat(dashboard): add EnterpriseView (KPI strip + account table)"
```

---

## Task 18: Wire the Enterprise tab into `DashboardClient`

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Import, add to `Tab` type and `TABS`**

Replace lines 1–28 of `src/components/dashboard/DashboardClient.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { BarChart2, Building2, Landmark, Users, Info, PenSquare, Mail, LayoutGrid, Table2, PlusSquare, Briefcase, ClipboardList } from 'lucide-react';
import { KanbanBoard } from './KanbanBoard';
import { PostJobForm } from './PostJobForm';
import { JobsPanel } from './JobsPanel';
import { CompaniesView } from './CompaniesView';
import { EnterpriseView } from './EnterpriseView';
import { B2bLeadsTable } from './B2bLeadsTable';
import { ContentStudio } from './ContentStudio';
import { EmailCampaigns } from './EmailCampaigns';
import { AnalyticsOverview } from './AnalyticsOverview';
import { CandidateDataTable } from './CandidateDataTable';
import { MyApplicationsClient } from '@/components/apply/MyApplicationsClient';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies' | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns';

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: 'overview',   label: 'Overview',          icon: <BarChart2     size={14} /> },
  { value: 'candidates', label: 'Candidates',         icon: <Users         size={14} /> },
  { value: 'post-job',   label: 'Post a New Job',     icon: <PlusSquare    size={14} /> },
  { value: 'manage-jobs',label: 'Manage Jobs',        icon: <Briefcase     size={14} /> },
  { value: 'companies',  label: 'B2B Companies',      icon: <Building2     size={14} /> },
  { value: 'enterprise', label: 'Enterprise',         icon: <Landmark      size={14} /> },
  { value: 'b2b-leads',  label: 'B2B Hiring Requests',icon: <ClipboardList size={14} /> },
  { value: 'content',    label: 'Content Studio',     icon: <PenSquare     size={14} /> },
  { value: 'campaigns',  label: 'Email Campaigns',    icon: <Mail          size={14} /> },
];
```

- [ ] **Step 2: Add the context banner line**

In the context banner block, after the `{activeTab === 'companies' && ...}` line, add:

```tsx
          {activeTab === 'enterprise'  && ' Enterprise CRM — track corporate accounts, contract value, and CSE performance.'}
```

- [ ] **Step 3: Render the view**

After the `{activeTab === 'companies' && <CompaniesView />}` line, add:

```tsx
      {activeTab === 'enterprise'  && <EnterpriseView />}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: Zero errors across the whole project.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): wire Enterprise tab into DashboardClient"
```

---

## Task 19: Full manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 2: Type-check one more time**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Start the dev server**

Run: `npm run dev`
Wait for `✓ Ready`, then open `http://localhost:3000/dashboard` in a browser signed in as the admin account.

- [ ] **Step 4: Verify the Enterprise tab renders**

Click the "Enterprise" tab. Expected: KPI strip shows four cards (all zero/`—` on an empty database), "No enterprise accounts yet" empty state, "Add Enterprise Account" and "Manage CSEs" buttons visible.

- [ ] **Step 5: Add a CSE**

Click "Manage CSEs", add a rep (e.g. name "Thiha", phone "09-123456"), confirm it appears in the list, close the modal.

- [ ] **Step 6: Add an enterprise account**

Click "Add Enterprise Account", fill in name + email, submit. Expected: form closes, new account row appears in the list with status "Lead", contract value "—".

- [ ] **Step 7: Add a contract and verify KPIs update**

Expand the new account row. Add a contract (e.g. value `50000`, type "Retainer", assign the CSE from Step 5). Expected: the row's contract-value column updates to show the new value, and the top-level KPI strip's "Total Active Contract Value" and "Active Contracts" numbers update to match after a refresh (SWR revalidates on `mutate()`).

- [ ] **Step 8: Log an interaction**

In the same expanded row, log an interaction (type "Call", note "Intro call, interested in Q3"). Expected: it appears at the top of the interaction list, and the collapsed row's "Last Contact" column updates to today's date.

- [ ] **Step 9: Change account status**

Click "In-Contract" in the status row. Expected: the badge in the collapsed header updates to the gold "In-Contract" style immediately.

- [ ] **Step 10: Verify the existing Companies tab still works**

Click the "B2B Companies" tab. Expected: existing SMB companies (if any) still display correctly with the updated status badges (no crash from the `CompanyStatus` type change).

- [ ] **Step 11: Final commit** (only if Step 10 required fixes; otherwise skip — nothing to commit)

```bash
git add -A
git commit -m "fix: address issues found in manual verification pass"
```
