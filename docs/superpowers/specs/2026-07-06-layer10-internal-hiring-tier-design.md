# Layer 10: Internal-Hiring Tier for Group Companies — Design Spec

Supersedes `docs/superpowers/specs/2026-07-05-layer10-internal-hiring-tier-design.md`
(that earlier document was a proposal sketch written during the overnight
roadmap session; this one is the reviewed, approved design, brainstormed
directly with the repo owner on 2026-07-06). Part of the Company
Dashboard roadmap, Layer 10 of 10.

## Reframing from the original sketch

The original sketch assumed this layer "unlocks" internal hiring for the
repo owner's F&B brands (Cheesy Bites, Hey U, TTT, Yangon Burger). Tracing
the actual code before designing anything found that's already possible
today with zero changes: `jobs.company` has always been free text with no
FK requirement to a `companies` row, so staff can already post a job
under any brand name through the existing Post Job form. **This layer is
not about enabling hiring — it's about CRM safety and hygiene**: don't
accidentally create a real invoice/commission against your own brand, and
keep internal brands out of the way of the actual client pipeline view.

## Decisions made (via interactive brainstorming)

1. **Scope**: safety/hygiene only, staff-managed. No Company Portal
   access for brand managers — internal hiring continues to be run
   entirely through the internal dashboard, same as any other job. No new
   auth surface.
2. **Invoicing**: skipped entirely for internal companies, not created at
   zero value. There's no commercial transaction to record, so nothing is
   created — a filled internal role is tracked the same way any candidate
   reaching "Hired" already is, no separate accounting artifact.

These two decisions simplify the original sketch's "force commissionRatePct
to 0" idea — since invoice creation for an internal company is blocked
entirely, there's no code path left for a forced-zero commission rate to
guard.

## Schema

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;
```

One additive column, defaulted `false` for every existing row — no
behavior change for any company that isn't explicitly marked internal.
`Company` type gains `isInternal: boolean`. A new `updateCompanyIsInternal(id, isInternal)`
accessor mirrors the existing `updateCompanyTier()` pattern exactly (same
shape, same convention, in `src/lib/db/companies.ts`).

## Safety guard

A new exported helper in `src/lib/db/companies.ts`:

```ts
export function isInvoiceableCompany(company: Company): boolean {
  return !company.isInternal;
}
```

Same "small pure function, single source of truth, unit-tested"
discipline the RBAC guardrail (`isLockedOutByChange`, Layer 6) already
established for this codebase — one check, reused everywhere it's
needed, not duplicated inline:

- `POST /api/invoices` calls it before `createInvoice()` and rejects with
  a 422 ("Cannot create an invoice for an internal company") if false —
  the real enforcement boundary, unbypassable via a direct API call.
- `CandidateDrawer.tsx`'s `companiesForInvoice` dropdown (where staff pick
  which company to bill) filters using the same helper, so the option to
  bill an internal brand doesn't appear in the normal flow at all. The
  server-side check is the backstop for a stale client, not the primary
  defense.

## Dashboard UI

**Companies tab** (`CompaniesView.tsx`, extending its existing
`search`/`statusFilter` client-side filter pattern):
- "Add Company" form gains an "Internal (group brand)" checkbox,
  unchecked by default.
- Each row gets a toggle to flip `isInternal` after creation, mirroring
  how `tier` is already editable per-row.
- A new "Show internal" filter checkbox, **unchecked by default** —
  internal brands stay out of the normal client-pipeline view unless a
  staff member deliberately opts in. When shown, internal rows carry a
  small "Internal" badge so they're never mistaken for a real client.

**Enterprise tab** (`EnterpriseView.tsx`): internal companies are
**excluded entirely, with no toggle** — Enterprise is specifically the
B2B sales/contract pipeline (contract value, CSE assignment), and an
internal brand will never have a contract. Adding a toggle here would
never reveal anything, so this tab simply filters `isInternal` out
unconditionally, keeping each tab consistent with what it's actually for.

## Testing

- `isInvoiceableCompany()` gets direct unit tests: returns `false` for
  `isInternal: true`, `true` for `isInternal: false` and for the default/
  undefined case.
- No route-handler tests (matches this codebase's existing convention —
  no API route has direct test coverage anywhere in this app; business
  logic is tested via extracted pure functions instead, same pattern as
  Layer 6's `isLockedOutByChange`).

## Non-goals

- Any special reporting/rollup across group brands ("total internal
  hires this quarter") — real, but a separate follow-up once there's
  actual usage to report on.
- Company Portal access for brand managers (Decision 1).
- Zero-value invoice records for internal placements (Decision 2).
- Any change to how jobs are posted for internal brands — that already
  works today via the existing free-text Post Job form; this layer adds
  CRM-side safety around it, not new posting capability.
