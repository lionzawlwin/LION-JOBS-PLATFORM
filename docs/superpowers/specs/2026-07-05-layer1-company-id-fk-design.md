# Layer 1: Real `company_id` FK on Jobs — Design Spec

Part of the Company Dashboard/Portal roadmap agreed with the repo owner
2026-07-05 (overnight autonomous session, blanket approval given). This
is Layer 1 of 10 — the foundational fix everything else in the roadmap
that touches the Company Portal depends on.

## Context

`/api/company-portal/me` (Sprint 2) and the public `/companies/[slug]`
page have always matched jobs to a company by exact string equality on
`jobs.company` (free text) — flagged in both places' own comments as a
"foundation, not finished" gap. No `jobs.company_id` column has ever
existed.

The public `/companies/[slug]` page is intentionally left alone: it
derives its slugs directly from job postings and has no dependency on
the CRM `companies` table — a company can have public listings without
ever being a CRM row. Only the Company Portal's identity-scoped view
needed the real FK.

## Change

- Migration `0016_add_jobs_company_id.sql`: adds nullable `jobs.company_id
  REFERENCES companies(id)`, backfills by exact name match, indexes it.
  Purely additive — no drop, no NOT NULL, no constraint that could break
  existing inserts.
- `appendJob()` now accepts an optional `companyId`; when omitted (every
  existing call site), it auto-resolves via a new `getCompanyByName()`
  exact-match lookup, so every new job gets linked going forward without
  changing the Post Job form.
- `/api/company-portal/me` matches on `company.companyId === companyId`
  first, falling back to the legacy name-string match only when a job has
  no `company_id` at all — defensive, so this can never regress
  visibility versus today's behavior.

## Verified

- `npx tsc --noEmit` clean.
- `npm run lint` shows the same 28 pre-existing problems as `main`
  (confirmed: none in the four files this touches).
- Migration applied live to the "Lion Jobs Agency" Supabase project
  (`gthewuhgrnnabyxkozvv`) via the Supabase MCP `apply_migration`.
  Verified via `execute_sql`: column + index exist; at time of
  application the live `jobs` table had 0 rows, so the backfill affected
  nothing but ran without error. `appendJob()`'s auto-resolve path will
  populate `company_id` correctly for every job created from here on.

## Non-goals

- Changing the Post Job form to a company picker (still free text — out
  of scope, doesn't block anything downstream since auto-resolve covers
  it).
- Touching `/companies/[slug]` — unrelated concept, confirmed above.
