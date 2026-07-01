# B2B Enterprise CRM — Design Spec

**Date:** 2026-07-01
**Status:** Approved, pending implementation plan

## Goal

Extend the existing dashboard with an Enterprise CRM: track high-value corporate accounts through Lead → Active → In-Contract, log contract value and interaction history with HR decision-makers, and attribute contract wins to the CSE (Channel Sales Executive) who closed them — with revenue and pipeline health visible at a glance.

## Out of scope (this spec)

- **CSE authentication/login.** CSEs do not sign into the dashboard. They are reference records (name/contact) assigned to accounts and contracts via dropdown. The app's auth stays a single hardcoded admin email, unchanged.
- **Historical performance snapshots/trend charts.** CSE and pipeline metrics are computed live from current data, not stored as periodic snapshots.
- **The 5-step enterprise outreach strategy.** Handled as a separate deliverable once this CRM ships, since it's a strategy/content artifact rather than a data model or UI. It maps onto the account status progression this spec defines (Lead → Active → In-Contract) — no additional schema required for it.

## Context: what already exists

The platform runs on Supabase (`src/lib/db/`), not Google Sheets (`sheets.ts` is archived, unused). There is already:
- A `companies` table + `CompaniesView.tsx` UI with `status: 'Lead' | 'Client' | 'Inactive'`, fed partly by the public `/hire-with-us` intake form via `b2b_leads`.
- A dashboard tab system (`DashboardClient.tsx`) with existing tabs: `overview | candidates | post-job | manage-jobs | companies | b2b-leads | content | campaigns`.
- An established API route convention: Route Handlers under `src/app/api/`, `requireAdmin()` session check, `{ error: string }` error shape, `src/lib/db/*.ts` one-file-per-table pattern.
- An established SWR hook convention (`src/hooks/useCandidates.ts`).
- A premium visual design system: brand/gold gradient tokens in `globals.css`, `glass-card` utility, `next-themes` dark mode, shadcn/ui primitives in `src/components/ui/`.
- No prior concept of sales reps, contracts, or interaction logs anywhere in the codebase.

This spec **extends** the existing `companies` table rather than creating a parallel `corporate_clients` table, since duplicating company fields (name, contact, industry) across two tables was judged worse than one filterable table with a `tier` field.

## Data model

### Alter `companies`

- Add `tier: 'smb' | 'enterprise'`, default `'smb'`. Existing rows are unaffected (stay SMB); enterprise accounts are flagged explicitly.
- Expand `status` from `'Lead' | 'Client' | 'Inactive'` to `'Lead' | 'Active' | 'In-Contract' | 'Inactive'`. Migration: existing `'Client'` rows become `'Active'` (a client without a tracked signed contract is "active," not yet formally "in-contract"). This status set applies uniformly to both tiers.

### New table `contracts`

One-to-many with `companies` — an account can have a full contract history (renewals, concurrent deals).

| column | type | notes |
|---|---|---|
| id | uuid/serial PK | |
| company_id | FK → companies.id | |
| value | numeric | |
| currency | text | default `'MMK'`, matches `jobs.currency` pattern |
| contract_type | `'Retainer' \| 'Contingency' \| 'Exclusive' \| 'Other'` | |
| status | `'Draft' \| 'Active' \| 'Completed' \| 'Terminated'` | |
| start_date | date, nullable | |
| end_date | date, nullable | |
| cse_id | FK → cse_reps.id, nullable | who gets credit |
| notes | text, nullable | |
| created_at | timestamp | |

### New table `interactions`

Append-only structured activity log per account. No PATCH/DELETE route — logs are never edited.

| column | type | notes |
|---|---|---|
| id | uuid/serial PK | |
| company_id | FK → companies.id | |
| type | `'Call' \| 'Email' \| 'Meeting' \| 'Demo' \| 'Contract Sent' \| 'Other'` | |
| note | text | |
| logged_by_cse_id | FK → cse_reps.id, nullable | null = logged by admin |
| occurred_at | timestamp | |
| created_at | timestamp | |

### New table `cse_reps`

Reference data only — not a user/auth table.

| column | type | notes |
|---|---|---|
| id | uuid/serial PK | |
| name | text | |
| phone | text, nullable | |
| email | text, nullable | |
| active | boolean | default true |
| created_at | timestamp | |

CSE performance is fully derived from `contracts.cse_id` and `interactions.logged_by_cse_id` — no dedicated metrics/snapshot table.

## API routes

All admin-gated via the existing `requireAdmin()` pattern (single hardcoded admin email — unchanged).

- **`/api/companies`** — extend existing GET/POST to accept `tier`. **`/api/companies/{id}`** — extend PATCH to accept `tier` and the expanded `status` enum.
- **`/api/contracts`** — GET (`?company_id=`), POST. **`/api/contracts/{id}`** — PATCH, DELETE.
- **`/api/interactions`** — GET (`?company_id=`), POST only (append-only).
- **`/api/cse`** — GET, POST. **`/api/cse/{id}`** — PATCH, DELETE.
- **`/api/enterprise/stats`** — GET only. Server-side aggregation (chosen over client-side aggregation or a Postgres view, to keep the KPI strip fast without adding SQL-migration overhead the current scale doesn't need). Exact computation per number:
  - Total Active Contract Value = `SUM(contracts.value) WHERE contracts.status = 'Active'`
  - Active Contracts = `COUNT(contracts) WHERE contracts.status = 'Active'`
  - Enterprise Accounts = `COUNT(companies) WHERE companies.tier = 'enterprise'` (all statuses, including Inactive — a full account-book count)
  - Top CSE = the `cse_id` with the highest `SUM(contracts.value) WHERE contracts.status = 'Active'`, grouped by CSE (a live ranking, not a time-bounded period — there is no historical/periodic data per the out-of-scope note above)

## Hooks (`src/hooks/`, SWR, mirroring `useCandidates.ts`)

`useEnterpriseAccounts()`, `useEnterpriseStats()`, `useContracts(companyId)`, `useInteractions(companyId)`, `useCseReps()`

## Dashboard UI

New **"Enterprise"** tab in `DashboardClient.tsx`'s existing tab list, new `EnterpriseView.tsx` component (parallels `CompaniesView.tsx`).

**KPI strip** — 4 `glass-card` tiles using the existing brand/gold gradient tokens and dark-mode support:
1. Total Active Contract Value (gold-accented, the headline number)
2. Active Contracts (count)
3. Enterprise Accounts (count)
4. Top CSE (name + their live active-contract value — a current ranking, not a time-bounded period)

**Account table** — columns: Account · Status (`Badge`, color-coded: Lead=gray, Active=brand blue, In-Contract=gold, Inactive=muted) · Contract Value · Assigned CSE · Last Contact (most recent `interactions.occurred_at` for that account) · expand chevron.

**Expandable row**, per account:
- Contract history (all `contracts` rows, inline add/edit: value, type, dates, status)
- Interaction timeline (`interactions`, newest first, quick-log form: type + note)
- CSE assignment dropdown (sourced from `cse_reps`)

**Header controls:** "Add Enterprise Account" (creates `companies` row with `tier='enterprise'`), status filter, CSE filter, "Manage CSEs" modal (CRUD on the rep roster — name/contact only, no permissions to configure since CSEs don't log in).

## Migration notes

- `companies.status` value `'Client'` → `'Active'` (data migration on existing rows).
- `companies.tier` backfilled to `'smb'` for all existing rows.
