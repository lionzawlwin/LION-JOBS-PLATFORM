# Layer 10: Internal-Hiring Tier for Group Companies — Design Spec

Part of the Company Dashboard roadmap, Layer 10 of 10. Spec only.

## Idea

The repo owner's wider ecosystem includes F&B brands (Cheesy Bites, Hey
U, TTT, Yangon Burger) hiring their own staff outside this platform
today. Since `companies` is just a CRM row plus a Company Portal login,
these brands could use the exact same platform to hire for themselves —
lowest-risk, highest-leverage item on the roadmap because it needs
**zero new schema**, only data + one small gate.

## Proposed design

- Add each group brand as a normal `companies` row, with a new boolean
  `is_internal` column (default `false`).
- `is_internal = true` companies: `commissionRatePct` forced to `0`
  (internal hiring shouldn't generate a placement invoice against
  itself) — one guard in `createInvoice`'s call path, not a schema
  constraint.
- Everything else — Company Portal login, job posting (once Layer 4
  ships), Contracts/Invoices sections (empty/hidden if `is_internal`,
  since there's no commercial contract with yourself) — works
  unmodified.
- Dashboard-side: a small filter toggle on the Companies/Enterprise tabs
  ("Show internal") so group-brand hiring doesn't clutter the CRM's
  actual client-pipeline view by default.

## Why this is low-risk

Purely additive data + one conditional (skip commission) in a single
existing function. No new auth surface, no new table, no schema
migration beyond one boolean column. Safe to build any time after Layer
4 (job posting self-service) exists, since that's what actually makes
this useful rather than cosmetic.

## Non-goals

- Any special reporting/rollup across group brands (e.g. "total internal
  hires this quarter") — a real feature, but a separate follow-up once
  there's actual usage to report on.
