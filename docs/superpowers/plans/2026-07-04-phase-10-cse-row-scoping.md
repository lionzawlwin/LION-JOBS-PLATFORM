# Phase 10: CSE Row-Level Data Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **A test suite now exists** (Phase 9, Vitest — unlike Phase 4's plan, written before it did). Tasks touching pure/testable logic follow **Implement → Test → Type-check → Commit**; tasks that only wire existing pieces together (route/DB glue, UI) follow **Implement → Type-check → Commit**, matching the process already used for Phases 4–9. `npm test` is also a required CI step (`.github/workflows/deploy.yml`, Phase 9) — a failing test blocks deploy, so don't skip the test steps below.

**Goal:** Scope `cse`-role visibility of Companies/Contracts/Interactions to their own linked CSE rep's accounts, enforced server-side, per `docs/superpowers/specs/2026-07-04-phase-10-cse-row-scoping-design.md`.

**Architecture:** One new nullable `staff.cse_rep_id` column links a `cse`-role login to a `cse_reps` row (previously unlinked, separate tables). Attached to the JWT/session at sign-in, mirroring how `role` already works. A new pure helper (`src/lib/cseScope.ts`) ports `EnterpriseView.tsx`'s existing client-side "most recent Active contract's cseId" derivation into a shared, unit-tested function. Enforcement is **application-layer filtering in the API routes**, not Postgres RLS — this app's service-role Supabase client bypasses RLS entirely (confirmed in `0006_enable_staff_rls.sql`), so a DB policy would be silently ineffective.

**Tech Stack:** Supabase migration, NextAuth JWT/session callbacks, Next.js Route Handlers, Vitest. No new dependencies.

---

## File Structure

**Create:**
- `supabase/migrations/0011_add_staff_cse_rep_link.sql`
- `src/lib/cseScope.ts` — pure scoping helpers
- `src/lib/cseScope.test.ts` — unit tests for the above

**Modify:**
- `src/types/index.ts` — `Staff.cseRepId`
- `src/types/next-auth.d.ts` — `Session.user.cseRepId`, `JWT.cseRepId`
- `src/lib/authOptions.ts` — attach `cseRepId` at sign-in, same pattern as `role`
- `src/lib/db/staff.ts` — `mapToStaff`, `updateStaff` read/write `cse_rep_id`
- `src/lib/auth.ts` — new `getSessionScope()`, additive
- `src/lib/db/contracts.ts` — `getContracts()` gains an optional `cseRepId` filter param
- `src/app/api/companies/route.ts` — `GET` applies scoping for `cse`
- `src/app/api/contracts/route.ts` — `GET` passes scoping param for `cse`
- `src/app/api/interactions/route.ts` — `GET` checks company ownership for `cse`
- `src/components/dashboard/EnterpriseView.tsx` — reuse the shared helper instead of its own inline derivation
- `src/hooks/useStaff.ts` — `updateStaffMember()`'s type gains `cseRepId`
- `src/components/dashboard/TeamView.tsx` — roster table gains a "CSE Rep" column for `cse`-role rows
- `PROGRESS.md` — new Phase 10 section

**Untouched by design:**
- `GET /api/cse` (CSE rep roster) — stays fully visible to `cse`, per spec's Goals
- `owner`/`admin`/`viewer` behavior — unchanged everywhere
- `b2b_leads` — out of scope per spec's Non-goals
- `requireTabAccess()` — unchanged signature; `getSessionScope()` is additive alongside it
- `createStaff()` — creation still email/name/role only; linking a CSE rep happens via the roster's per-row edit, not at creation time (no stated need for it at creation)

---

### Task 1: Migration — link `staff` to `cse_reps`

**Files:**
- Create: `supabase/migrations/0011_add_staff_cse_rep_link.sql`

- [ ] **Step 1: Write the migration**

Per `supabase/MIGRATIONS.md`'s process (read it before applying).

```sql
-- Phase 10: link a cse-role staff login to a cse_reps row, so row-level
-- scoping has something to scope by. Nullable, no backfill — staff and
-- cse_reps are independent tables today with no shared key to infer a
-- match from (not even email is guaranteed to line up). Existing cse
-- staff rows get NULL and must be linked manually via Team & Access.
-- See docs/superpowers/specs/2026-07-04-phase-10-cse-row-scoping-design.md.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS cse_rep_id TEXT REFERENCES cse_reps(id);
```

- [ ] **Step 2: Apply and verify**

Run: `supabase db push`, then `supabase migration list` to confirm `0011` shows as applied and matches the linked project.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0011_add_staff_cse_rep_link.sql
git commit -m "feat(db): add staff.cse_rep_id link for Phase 10 row scoping"
```

---

### Task 2: Types + session plumbing

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/lib/authOptions.ts`

- [ ] **Step 1: Extend the `Staff` type**

In `src/types/index.ts`, replace:

```ts
export interface Staff {
  id:        string;
  email:     string;
  name:      string;
  role:      StaffRole;
  active:    boolean;
  createdAt: string;
}
```

with:

```ts
export interface Staff {
  id:        string;
  email:     string;
  name:      string;
  role:      StaffRole;
  active:    boolean;
  cseRepId:  string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Extend the NextAuth type augmentation**

Replace the full contents of `src/types/next-auth.d.ts`:

```ts
import type { StaffRole } from './index';

declare module 'next-auth' {
  interface Session {
    user?: {
      name?:     string | null;
      email?:    string | null;
      image?:    string | null;
      role?:     StaffRole;
      cseRepId?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?:     StaffRole;
    cseRepId?: string | null;
  }
}
```

- [ ] **Step 3: Attach `cseRepId` at sign-in**

In `src/lib/authOptions.ts`, replace the `jwt` and `session` callbacks:

```ts
    async jwt({ token, user }) {
      // `user` is only populated on the initial sign-in call, not on every
      // subsequent token read — so this DB lookup runs once per login, not
      // once per request. Role/CSE-link changes made in the Team & Access
      // tab take effect on that staff member's next sign-in, not immediately.
      if (user?.email) {
        const staffMember = await getStaffByEmail(user.email);
        token.role = staffMember?.role ?? (user.email === ADMIN_EMAIL ? 'owner' : 'viewer');
        token.cseRepId = staffMember?.cseRepId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as StaffRole | undefined) ?? 'viewer';
        session.user.cseRepId = token.cseRepId ?? null;
      }
      return session;
    },
```

(The `signIn` callback and everything else in this file is unchanged.)

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`Staff.cseRepId` isn't read/written anywhere yet — this just confirms the type/augmentation changes are internally consistent.)

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/types/next-auth.d.ts src/lib/authOptions.ts
git commit -m "feat(auth): attach cseRepId to session/JWT, mirroring role"
```

---

### Task 3: `staff.ts` accessor — read/write `cseRepId`

**Files:**
- Modify: `src/lib/db/staff.ts`

- [ ] **Step 1: Extend `mapToStaff`**

Replace:

```ts
function mapToStaff(row: Record<string, unknown>): Staff {
  return {
    id:        row.id as string,
    email:     row.email as string,
    name:      row.name as string,
    role:      row.role as StaffRole,
    active:    (row.active as boolean) ?? true,
    createdAt: row.created_at as string,
  };
}
```

with:

```ts
function mapToStaff(row: Record<string, unknown>): Staff {
  return {
    id:        row.id as string,
    email:     row.email as string,
    name:      row.name as string,
    role:      row.role as StaffRole,
    active:    (row.active as boolean) ?? true,
    cseRepId:  (row.cse_rep_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}
```

- [ ] **Step 2: Extend `updateStaff` to accept `cseRepId`**

Replace:

```ts
export async function updateStaff(
  id: string,
  data: Partial<{ name: string; role: StaffRole; active: boolean }>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.name   !== undefined) update.name = data.name;
  if (data.role   !== undefined) update.role = data.role;
  if (data.active !== undefined) update.active = data.active;

  const { error } = await supabase.from('staff').update(update).eq('id', id);
  if (error) throw new Error(`Failed to update staff member: ${error.message}`);
}
```

with:

```ts
export async function updateStaff(
  id: string,
  data: Partial<{ name: string; role: StaffRole; active: boolean; cseRepId: string | null }>,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.name     !== undefined) update.name = data.name;
  if (data.role     !== undefined) update.role = data.role;
  if (data.active   !== undefined) update.active = data.active;
  if (data.cseRepId !== undefined) update.cse_rep_id = data.cseRepId;

  const { error } = await supabase.from('staff').update(update).eq('id', id);
  if (error) throw new Error(`Failed to update staff member: ${error.message}`);
}
```

(`createStaff` and `listStaff`/`getStaffByEmail` are unchanged — `mapToStaff` already covers the read side for all three.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/staff.ts
git commit -m "feat(db): read/write staff.cse_rep_id in the staff accessor"
```

---

### Task 4: `getSessionScope()` guard

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add the new helper, additive alongside existing guards**

Append to `src/lib/auth.ts` (after the existing `requireTabAccess` function, nothing else in the file changes):

```ts

// Phase 10: row-level scoping. Separate from requireTabAccess() by design —
// that function only answers "is this tab/action allowed," this one answers
// "whose data should be returned." Routes that need row scoping call both.
// See docs/superpowers/specs/2026-07-04-phase-10-cse-row-scoping-design.md.
export async function getSessionScope(): Promise<{ role: StaffRole; cseRepId: string | null } | null> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role) return null;
  return { role, cseRepId: session?.user?.cseRepId ?? null };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(auth): add getSessionScope() for Phase 10 row-level scoping"
```

---

### Task 5: Shared scoping helper + tests

**Files:**
- Create: `src/lib/cseScope.ts`
- Create: `src/lib/cseScope.test.ts`

- [ ] **Step 1: Write the pure helper**

Ports `EnterpriseView.tsx`'s existing inline derivation (see Task 9) without changing its logic.

```ts
import type { Company, Contract } from '@/types';

// A company's "owning" CSE is the cseId of its most recent Active
// contract. Mirrors EnterpriseView.tsx's client-side filter-dropdown
// derivation exactly — this just makes it the actual security boundary
// (server-side) instead of a UX convenience (client-side).
export function deriveActiveCseByCompany(contracts: Contract[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of contracts) {
    if (c.status !== 'Active' || !c.cseId) continue;
    if (!map.has(c.companyId)) {
      map.set(c.companyId, c.cseId);
    }
  }
  return map;
}

export function filterCompaniesForCse(
  companies: Company[],
  contracts: Contract[],
  cseRepId: string | null,
): Company[] {
  if (!cseRepId) return [];
  const ownerByCompany = deriveActiveCseByCompany(contracts);
  return companies.filter((company) => ownerByCompany.get(company.id) === cseRepId);
}
```

- [ ] **Step 2: Write tests**

```ts
import { describe, it, expect } from 'vitest';
import { deriveActiveCseByCompany, filterCompaniesForCse } from './cseScope';
import type { Company, Contract } from '@/types';

function makeContract(overrides: Partial<Contract>): Contract {
  return {
    id: 'c1', companyId: 'co1', value: 0, currency: 'MMK',
    contractType: 'Retainer', status: 'Active', startDate: null, endDate: null,
    cseId: 'cse1', notes: '', createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeCompany(overrides: Partial<Company>): Company {
  return {
    id: 'co1', name: 'Acme', contactPerson: '', email: '', phone: '',
    industry: '', city: '', status: 'Active', tier: 'smb', notes: '',
    lastContacted: '', createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('deriveActiveCseByCompany', () => {
  it('maps a company to its Active contract\'s cseId', () => {
    const map = deriveActiveCseByCompany([makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Active' })]);
    expect(map.get('co1')).toBe('cse1');
  });

  it('ignores non-Active contracts', () => {
    const map = deriveActiveCseByCompany([makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Draft' })]);
    expect(map.has('co1')).toBe(false);
  });

  it('ignores contracts with no cseId', () => {
    const map = deriveActiveCseByCompany([makeContract({ companyId: 'co1', cseId: null, status: 'Active' })]);
    expect(map.has('co1')).toBe(false);
  });

  it('takes the first-seen Active contract when a company has more than one', () => {
    const map = deriveActiveCseByCompany([
      makeContract({ id: 'c1', companyId: 'co1', cseId: 'cse1', status: 'Active' }),
      makeContract({ id: 'c2', companyId: 'co1', cseId: 'cse2', status: 'Active' }),
    ]);
    expect(map.get('co1')).toBe('cse1');
  });

  it('handles multiple companies independently', () => {
    const map = deriveActiveCseByCompany([
      makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Active' }),
      makeContract({ id: 'c2', companyId: 'co2', cseId: 'cse2', status: 'Active' }),
    ]);
    expect(map.get('co1')).toBe('cse1');
    expect(map.get('co2')).toBe('cse2');
  });
});

describe('filterCompaniesForCse', () => {
  const contracts = [
    makeContract({ companyId: 'co1', cseId: 'cse1', status: 'Active' }),
    makeContract({ id: 'c2', companyId: 'co2', cseId: 'cse2', status: 'Active' }),
  ];
  const companies = [makeCompany({ id: 'co1' }), makeCompany({ id: 'co2', name: 'Other' })];

  it('returns only companies owned by the given cseRepId', () => {
    expect(filterCompaniesForCse(companies, contracts, 'cse1')).toEqual([companies[0]]);
  });

  it('returns an empty array for a cseRepId with no owned companies', () => {
    expect(filterCompaniesForCse(companies, contracts, 'cse-nobody')).toEqual([]);
  });

  it('fails closed — returns an empty array when cseRepId is null', () => {
    expect(filterCompaniesForCse(companies, contracts, null)).toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all new tests pass, existing 28 `permissions.test.ts` tests still pass.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cseScope.ts src/lib/cseScope.test.ts
git commit -m "feat(lib): add cseScope helper, ported from EnterpriseView's inline derivation"
```

---

### Task 6: Scope `GET /api/companies`

**Files:**
- Modify: `src/app/api/companies/route.ts`

- [ ] **Step 1: Apply scoping for `cse` role**

Replace the `GET` handler:

```ts
import { requireTabAccess } from '@/lib/auth';
import { getSessionScope } from '@/lib/auth';
import { getCompanies, appendCompany, getContracts } from '@/lib/db';
import { filterCompaniesForCse } from '@/lib/cseScope';
import type { NextRequest } from 'next/server';

export async function GET() {
  if (!(await requireTabAccess('companies', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const scope = await getSessionScope();
  const companies = await getCompanies();

  if (scope?.role === 'cse') {
    const contracts = await getContracts();
    const scoped = filterCompaniesForCse(companies, contracts, scope.cseRepId);
    return Response.json(scoped, { headers: { 'Cache-Control': 'no-store' } });
  }

  return Response.json(companies, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
```

(`POST` is unchanged — creating a company isn't row-scoped, and `owner`/`admin` are the only roles with `companies: manage` today per the Phase 4 matrix, so `cse` can't reach `POST` regardless.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/companies/route.ts
git commit -m "feat(api): scope GET /api/companies to the caller's CSE accounts"
```

---

### Task 7: Scope `GET /api/contracts`

**Files:**
- Modify: `src/lib/db/contracts.ts`
- Modify: `src/app/api/contracts/route.ts`

- [ ] **Step 1: Add an optional `cseRepId` filter to `getContracts()`**

Replace:

```ts
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
```

with:

```ts
export async function getContracts(companyId?: string, cseRepId?: string): Promise<Contract[]> {
  let query = supabase.from('contracts').select('*').order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  if (cseRepId)  query = query.eq('cse_id', cseRepId);

  const { data, error } = await query;
  if (error) {
    console.error('[db/contracts] getContracts error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToContract);
}
```

(Filtering by `cse_id` directly at the query level — unlike Companies, `Contract` already has this column, no derivation needed.)

- [ ] **Step 2: Pass the scope through in the route**

Replace the `GET` handler in `src/app/api/contracts/route.ts`:

```ts
import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { getContracts, appendContract } from '@/lib/db';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('enterprise', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get('company_id') ?? undefined;
  const scope = await getSessionScope();
  const cseRepId = scope?.role === 'cse' ? (scope.cseRepId ?? '__none__') : undefined;
  const contracts = await getContracts(companyId, cseRepId);
  return Response.json(contracts, { headers: { 'Cache-Control': 'no-store' } });
}
```

Note the `'__none__'` sentinel: an unlinked `cse` (`cseRepId === null`) must still fail closed rather than the `cseRepId` filter being skipped entirely (which is what passing `undefined` to `getContracts` would do — returning everything). `'__none__'` never matches a real `cse_reps.id`, so the query correctly returns zero rows.

(`POST` is unchanged, same reasoning as Task 6 — only `owner`/`admin` have `enterprise: manage`.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/contracts.ts src/app/api/contracts/route.ts
git commit -m "feat(api): scope GET /api/contracts to the caller's CSE, fail closed if unlinked"
```

---

### Task 8: Scope `GET /api/interactions`

**Files:**
- Modify: `src/app/api/interactions/route.ts`

- [ ] **Step 1: Check company ownership before returning**

Replace the `GET` handler:

```ts
import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { getInteractions, appendInteraction, getContracts } from '@/lib/db';
import { deriveActiveCseByCompany } from '@/lib/cseScope';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('enterprise', 'view'))) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const companyId = req.nextUrl.searchParams.get('company_id');
  if (!companyId) {
    return Response.json({ error: 'company_id query param is required.' }, { status: 422 });
  }

  const scope = await getSessionScope();
  if (scope?.role === 'cse') {
    const contracts = await getContracts();
    const owner = deriveActiveCseByCompany(contracts).get(companyId);
    if (!owner || owner !== scope.cseRepId) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }
  }

  const interactions = await getInteractions(companyId);
  return Response.json(interactions, { headers: { 'Cache-Control': 'no-store' } });
}
```

(`POST` is unchanged — same reasoning as Tasks 6–7.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/interactions/route.ts
git commit -m "feat(api): scope GET /api/interactions by the caller's company ownership"
```

---

### Task 9: De-duplicate `EnterpriseView.tsx`'s inline derivation

**Files:**
- Modify: `src/components/dashboard/EnterpriseView.tsx`

- [ ] **Step 1: Reuse the shared helper**

Replace the import line:

```tsx
import type { CompanyStatus } from '@/types';
```

with:

```tsx
import type { CompanyStatus } from '@/types';
import { deriveActiveCseByCompany } from '@/lib/cseScope';
```

Replace:

```tsx
  const assignedCseByCompany = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of allContracts) {
      if (c.status !== 'Active' || !c.cseId) continue;
      if (!map.has(c.companyId)) {
        map.set(c.companyId, c.cseId);
      }
    }
    return map;
  }, [allContracts]);
```

with:

```tsx
  const assignedCseByCompany = useMemo(
    () => deriveActiveCseByCompany(allContracts),
    [allContracts],
  );
```

This is a pure refactor — behavior is identical, now backed by the same tested function the server-side scoping uses, instead of a second copy of the same logic.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/EnterpriseView.tsx
git commit -m "refactor(dashboard): reuse cseScope helper in EnterpriseView, remove duplicate logic"
```

---

### Task 10: Team & Access UI — link a CSE rep to a staff member

**Files:**
- Modify: `src/hooks/useStaff.ts`
- Modify: `src/components/dashboard/TeamView.tsx`

- [ ] **Step 1: Extend `updateStaffMember`'s type**

In `src/hooks/useStaff.ts`, replace:

```ts
  async function updateStaffMember(id: string, update: Partial<{ name: string; role: StaffRole; active: boolean }>) {
```

with:

```ts
  async function updateStaffMember(id: string, update: Partial<{ name: string; role: StaffRole; active: boolean; cseRepId: string | null }>) {
```

(The function body already forwards `update` as-is via `JSON.stringify(update)` — no other change needed here.)

- [ ] **Step 2: Extend `PATCH /api/staff/[id]` to accept `cseRepId`**

In `src/app/api/staff/[id]/route.ts`, replace the `updateStaff` call:

```ts
  try {
    await updateStaff(id, {
      name:   body.name   !== undefined ? String(body.name) : undefined,
      role:   body.role   !== undefined ? (body.role as StaffRole) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
```

with:

```ts
  try {
    await updateStaff(id, {
      name:     body.name     !== undefined ? String(body.name) : undefined,
      role:     body.role     !== undefined ? (body.role as StaffRole) : undefined,
      active:   body.active   !== undefined ? Boolean(body.active) : undefined,
      cseRepId: body.cseRepId !== undefined ? (body.cseRepId === null ? null : String(body.cseRepId)) : undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
```

- [ ] **Step 3: Add a "CSE Rep" column to the roster table**

In `src/components/dashboard/TeamView.tsx`:

Replace the import line:

```tsx
import { useStaff } from '@/hooks/useStaff';
import type { StaffRole } from '@/types';
```

with:

```tsx
import { useStaff } from '@/hooks/useStaff';
import { useCseReps } from '@/hooks/useCseReps';
import type { StaffRole } from '@/types';
```

Add, right after the existing `changeRole`/`toggleActive` functions (before `if (loading) { ... }`):

```tsx
  const { cseReps } = useCseReps();

  async function changeCseRep(id: string, cseRepId: string) {
    setSavingId(id);
    try {
      const ok = await updateStaffMember(id, { cseRepId: cseRepId || null });
      if (!ok) alert('Could not update linked CSE rep. Please try again.');
    } finally {
      setSavingId(null);
    }
  }
```

Add a new table header cell, in the `<thead>` row, after `<th className="pb-2">Role</th>`:

```tsx
                  <th className="pb-2">CSE Rep</th>
```

Add a new `<td>`, in the `<tbody>` row, after the existing Role `<td>` (before the Status `<td>`):

```tsx
                    <td className="py-2">
                      {member.role === 'cse' ? (
                        <select
                          value={member.cseRepId ?? ''}
                          onChange={(e) => changeCseRep(member.id, e.target.value)}
                          disabled={savingId === member.id}
                          className="rounded-xl border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          <option value="">Unlinked</option>
                          {cseReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useStaff.ts src/app/api/staff/[id]/route.ts src/components/dashboard/TeamView.tsx
git commit -m "feat(dashboard): link a cse-role staff member to a CSE rep in Team & Access"
```

---

### Task 11: Final verification

**Files:** none (read-only verification), plus `PROGRESS.md`

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: all tests pass (28 existing + new `cseScope.test.ts` tests).

- [ ] **Step 2: Full type-check**

Run: `npx tsc --noEmit`
Expected: clean, no errors anywhere in the project.

- [ ] **Step 3: Confirm the untouched routes are still exactly as designed**

Run: `grep -n "requireTabAccess('enterprise', 'view')" src/app/api/cse/route.ts`
Expected: one match, confirming `/api/cse` still returns the full roster unscoped (per spec's Goals — this is intentional, not a missed task).

- [ ] **Step 4: Confirm no `b2b_leads` code was touched**

Run: `git diff --stat main -- src/app/api/leads src/lib/db/leads.ts`
Expected: empty output — confirms Non-goals (B2B Leads scoping) weren't accidentally touched.

- [ ] **Step 5: Update `PROGRESS.md`**

Add a new "Phase 10: CSE Row-Level Data Scoping" section (root `PROGRESS.md`, same table + log format as Phases 4–9), referencing this plan and the design spec, and noting: the fail-closed behavior for unlinked `cse` staff, that `b2b_leads` scoping was explicitly deferred (no assignment concept exists), and that existing `cse` staff rows need manual linking post-deploy (no backfill).

- [ ] **Step 6: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: record Phase 10 CSE row-scoping completion in PROGRESS.md"
```

- [ ] **Step 7: Push the branch and open a PR (do not merge to main)**

```bash
git push -u origin feat/phase-10-cse-row-scoping
gh pr create --title "Phase 10: CSE row-level data scoping" --body "$(cat <<'EOF'
## Summary
- Links staff to cse_reps via a new nullable staff.cse_rep_id column (migration 0011), attached to the session/JWT the same way role already is.
- Scopes GET /api/companies, GET /api/contracts, and GET /api/interactions to a cse-role caller's own linked CSE rep, enforced server-side (application-layer filtering, not RLS -- this app's service-role Supabase client bypasses RLS entirely).
- Ports EnterpriseView.tsx's existing client-side CSE-attribution derivation into a shared, unit-tested helper (src/lib/cseScope.ts), removing the duplicate inline logic.
- Adds a "CSE Rep" column to Team & Access's roster table so owner/admin can link a cse-role staff member to a CSE rep.

## Explicitly out of scope (see design spec)
- B2B Leads scoping -- no assignment concept exists in that table at all; a real product decision (shared pool vs. per-lead assignment), not this phase's job.
- Retroactive backfill -- existing cse staff rows get NULL and need manual linking post-deploy.
- Any RLS-based enforcement -- architecturally ineffective given this app's service-role-only Supabase access.

## Fail-closed behavior
An unlinked cse (cseRepId === null) sees an EMPTY list for Companies/Contracts/Interactions, not the full set -- deliberate, matches Phase 4's existing security posture.

## Test plan
- [x] npm test -- all tests passing (28 existing + new cseScope tests)
- [x] npx tsc --noEmit -- clean
- [ ] Link a test cse-role staff member to a CSE rep via Team & Access, confirm they see only that rep's companies/contracts/interactions
- [ ] Confirm an unlinked cse staff member sees empty Companies/Enterprise views, not everything
- [ ] Confirm owner/admin/viewer behavior is completely unchanged
EOF
)"
```

Report the PR URL back once done — **do not merge**.

---

## Self-Review Notes

**Spec coverage:** every scoped domain from the spec (Companies, Contracts, Interactions) has a task (6, 7, 8); the shared helper and its tests are Task 5; session/type plumbing is Tasks 2–4; the UI to actually link a `cse` to a rep is Task 10 (without it, the whole feature is unreachable — a `cse` would just be permanently unlinked and see nothing). `EnterpriseView.tsx`'s de-duplication (Task 9) was called for in the spec's Enforcement section ("ported to a shared, testable helper rather than duplicated inline") and is easy to forget since it's a refactor, not new functionality — included explicitly so it isn't dropped.

**Fail-closed consistency:** Task 5's `filterCompaniesForCse` returns `[]` for `cseRepId: null`; Task 7's contracts route uses a `'__none__'` sentinel for the same reason (an `undefined` param would've skipped the filter and returned everything — the opposite of intended); Task 8's interactions check explicitly rejects when `owner` is falsy or doesn't match. All three scoped routes fail closed the same way, not three different ad hoc behaviors.

**Non-goals respected:** no `b2b_leads` file appears in any task's file list; Task 11 Step 4 adds an explicit verification grep for this rather than trusting it by inspection alone. No RLS policy is proposed anywhere. `createStaff()` is deliberately left unmodified (noted in File Structure) rather than gold-plating creation-time linking that no task actually needs.

**No placeholders:** every step shows the exact code being added or the exact existing code being replaced, including full before/after blocks for every modified function.
