# CSE / Team Performance View Implementation Plan

> **For agentic workers:** Executed inline under broad standing autonomous-execution authorization (2026-07-06, extended to the full remaining roadmap). REQUIRED SUB-SKILL: superpowers:executing-plans conventions.

**Goal:** Turn the existing CSE row-scoping + CRM data into a per-rep performance breakdown — CEO Roadmap Item #7 (previously "Later" tier, now authorized).

**Architecture:** `computeCsePerformance()` is a pure function reusing `deriveActiveCseByCompany()` (already in `src/lib/cseScope.ts`, used today for company-ownership derivation) rather than reinventing that logic. A route fetches `cse_reps`/`contracts`/`b2b_leads` (all already-existing full-list accessors), computes per-rep rows, and — reusing the exact row-scoping precedent from Phase 10 — restricts a `cse`-role caller to their own row while `owner`/`admin` see every rep.

**Design decisions:**
- **No new migration, no new accessor** — every input (`getCseReps`, `getContracts`, `getB2bLeads`) already exists.
- **Per-rep metrics**: active contract count, active contract value, assigned-companies count (via `deriveActiveCseByCompany`), claimed-leads count. Chosen because all four are already-tracked, zero-new-query facts — no invented metric requiring new instrumentation.
- **RBAC**: gated on `enterprise` tab access (same as the rest of `EnterpriseView`). A `cse`-role caller only sees their own row — same row-scoping principle as Phase 10's companies/contracts/interactions scoping, applied here for consistency rather than showing a CSE their peers' numbers.
- **Mount point**: a new section inside `EnterpriseView.tsx` (no new dashboard tab — extends existing IA, matches the CEO's "no rewrites, extend incrementally" constraint).

**Tech stack:** existing accessors, Next.js route handler, SWR, Vitest.

---

### Task 1: Pure `computeCsePerformance()` + tests
**Files:** Create `src/lib/csePerformance.ts`, test `src/lib/csePerformance.test.ts`
- Reuses `deriveActiveCseByCompany()` from `cseScope.ts` for the assigned-companies count.
- Sorted by `activeContractValue` descending.

### Task 2: Type
**Files:** Modify `src/types/index.ts` — `CsePerformanceRow { cseRepId, name, activeContractsCount, activeContractValue, assignedCompaniesCount, claimedLeadsCount }`.

### Task 3: `/api/cse-performance` route
**Files:** Create `src/app/api/cse-performance/route.ts`
- `requireTabAccess('enterprise', 'view')`; `getSessionScope()` to filter to own row when `role === 'cse'`.

### Task 4: `useCsePerformance` hook + `CsePerformanceTable` component
**Files:** Create `src/hooks/useCsePerformance.ts`, `src/components/dashboard/CsePerformanceTable.tsx`
- Mount inside `EnterpriseView.tsx`, above the existing accounts list.

### Task 5: Verify + ship
- `npx tsc --noEmit`, `npm test`, `npm run lint` (no new errors) — branch, PR, CI, merge.
