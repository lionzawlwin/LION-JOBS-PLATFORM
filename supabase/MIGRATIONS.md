# Migrations — current state and process

## The gap this closes

Every migration in this folder was written as a one-off SQL file with a
`-- Run this in Supabase SQL Editor once.` comment, applied by hand, and
never tracked by the Supabase CLI's own migration history. That's how the
Billing & Invoicing migration (`0004_add_billing_invoicing.sql`) had to be
applied on 2026-07-02: paste into the SQL Editor, then manually verify
`invoices` and `applications.final_agreed_salary` exist via `list_tables`.
It worked, but it depends entirely on a human remembering to do it and
verify it, every time, with no record left behind of what ran when.

## Current true state (as of 2026-07-03)

- **Supabase's own migration history** (`supabase migration list` /
  the `supabase_migrations.schema_migrations` table) has exactly **one**
  entry: `20260630131708_initial_schema` — the original tables (`jobs`,
  `candidates`, `applications`, `companies`, `b2b_leads`, `subscribers`,
  `feedback`).
- **The actual live production schema** additionally includes everything
  from all four files below — confirmed directly against the "Lion Jobs
  Agency" project (`gthewuhgrnnabyxkozvv`) via the Supabase MCP
  `list_tables`/`list_migrations` tools, not assumed from the files.
- These two facts disagree. The CLI's history table does not reflect
  reality. This is exactly the kind of drift a real migration system
  exists to prevent, and right now nothing prevents it.

## Numbering convention (starting now)

Files are prefixed `NNNN_` in the order they were actually applied to
production, not the order they'd ideally have been designed:

| File | Applied | Adds |
|---|---|---|
| `0001_add_ai_scoring.sql` | earliest of the four | `applications.ai_score`/`ai_summary`/`ai_reasoning`/`ai_processed_at` |
| `0002_add_enterprise_crm.sql` | 2026-07-01 | `companies.tier`, `contracts`, `interactions`, `cse_reps` |
| `0003_add_legal_docs.sql` | 2026-07-02 | `agency_settings`, `candidate_consents`, interview-detail columns |
| `0004_add_billing_invoicing.sql` | 2026-07-02 | `applications.final_agreed_salary`, `invoices` |
| `0005_add_staff.sql` | 2026-07-03 | `staff` table (Team & Access roster, no login-gate wiring yet) |
| `0006_enable_staff_rls.sql` | 2026-07-03 | Enables RLS on `staff` — see "Lesson learned" below |
| `0007_add_system_events.sql` | 2026-07-03 | `system_events` table (Phase 5 observability) |
| `0008_add_lead_status_updated_at.sql` | 2026-07-04 | `b2b_leads.status_updated_at` (Phase 7 CRM alerting) |
| `0009_add_system_events_indexes.sql` | 2026-07-04 | Indexes on `system_events` for category/route/created_at (Phase 8 perf) |
| `0010_fix_system_events_level_index.sql` | 2026-07-04 | Replace non-matching `system_events` index with one covering `listSystemEvents()`'s actual `level`-filtered query shape (Phase 8 follow-up) |
| `0011_add_staff_cse_rep_link.sql` | 2026-07-04 | `staff.cse_rep_id` link (Phase 10 CSE row-level scoping) |
| `0012_add_lead_claiming.sql` | 2026-07-04 | `b2b_leads.claimed_by_cse_rep_id` / `claimed_at` (Phase 15, Shared Pool option) — applied via Supabase MCP `apply_migration`, verified live via `list_tables` (new FK `b2b_leads_claimed_by_cse_rep_id_fkey` confirmed present) |
| `0013_add_portal_login_tokens.sql` | 2026-07-04 | `portal_login_tokens` table — shared magic-link login tokens for the new Company Portal + Candidate Portal (Sprint 2, Phases 23/24). Applied via Supabase MCP `apply_migration`, verified live via `list_tables` (RLS enabled, `subject_type` check constraint present). |
| `0014_add_system_event_resolution.sql` | 2026-07-04 | `system_events.resolved_at`/`resolved_by` — lets a fixed problem be marked resolved instead of showing as an active failure for up to 7 days. Applied via Supabase MCP `apply_migration`, verified live via `list_tables` (both nullable columns present, index `system_events_resolved_at_idx` created). |
| `0015_add_rate_limit_category.sql` | 2026-07-04 | Adds `'rate_limit'` to `system_events.category`'s CHECK constraint (drop + recreate `system_events_category_check`, name confirmed via `pg_constraint` before writing the migration). Applied via Supabase MCP `apply_migration`, verified live via `pg_get_constraintdef`. |
| `0016_add_jobs_company_id.sql` | 2026-07-05 | Real `company_id` FK on `jobs`, backfilled by exact name match against `companies` (Layer 1 of the Company Dashboard roadmap). Applied via Supabase MCP `apply_migration` (per that session's PROGRESS.md entry); backfilled into this table on 2026-07-05 by a separate session, verified live via `pg_indexes` (`jobs_company_id_idx` present). |
| `0017_add_role_permissions.sql` | 2026-07-05 | `role_permissions` + `permission_changes` tables, seeded with the exact 52 `(role, tab_domain)` rows from `permissions.ts`'s hardcoded matrix (Layer 6 Dynamic RBAC, Step 1/3 -- schema + seed only, no behavior change yet). Applied via Supabase MCP `apply_migration` (per that session's PROGRESS.md entry); backfilled into this table on 2026-07-05 by a separate session, verified live via `list_tables` (both tables present, RLS enabled, `role_permissions` has exactly 52 rows) and `pg_indexes` (`role_permissions_pkey`, `permission_changes_pkey`, `permission_changes_changed_at_idx` all present). |
| `0018_add_stats_history.sql` | 2026-07-05 | `stats_history` table (daily aggregate snapshots for dashboard trend charts). Applied via Supabase MCP `apply_migration`, verified live via `list_tables` (RLS enabled, columns match exactly) and `pg_indexes` (primary key, `snapshot_date` unique constraint, and `stats_history_snapshot_date_idx` all present). |
| `0019_add_set_role_permission_function.sql` | 2026-07-06 | `set_role_permission` Postgres function — atomic upsert + audit-row insert for `role_permissions` writes (Layer 6 Dynamic RBAC, Step 3/3). Applied via Supabase MCP `apply_migration`, verified live via `pg_proc` introspection (function exists, 5 args, volatile). |
| `0020_add_companies_is_internal.sql` | 2026-07-06 | `companies.is_internal` column — CRM safety/hygiene flag for the repo owner's own F&B brands (Cheesy Bites, Hey U, TTT, Yangon Burger), blocking invoice creation and keeping them out of the client pipeline view by default (Layer 10). Applied via Supabase MCP `apply_migration`, verified live via `information_schema.columns` (boolean, `NOT NULL DEFAULT false`). |
| `0021_add_audit_log.sql` | 2026-07-05 | `audit_log` table (actor/action/domain/entity trail for every successful staff mutation, Phase B1 Audit Log). Applied via `supabase db push` after repairing migration history (9 MCP-applied timestamp entries marked reverted, 0012–0020 marked applied). Verified via `supabase migration list` — all 0001–0021 in local/remote sync. |
| `0022_add_job_requests.sql` | 2026-07-05 | `job_requests` table (Company Portal job posting requests, Layer 4). Supabase MCP was unavailable this session (server never connected), so applied via `supabase db push` instead (project already linked); verified live via `supabase db query --linked` (columns match exactly, `relrowsecurity` true, both indexes plus PK present, `job_requests_status_check` constraint present). |
| `0023_add_companies_parent_account_id.sql` | 2026-07-06 | `companies.parent_account_id` (self-referencing FK, nullable) + `companies_parent_account_id_not_self` CHECK + index (Layer 12, Multi-Brand Account Grouping). Written on `feat/dashboard-commercial-layers`; initial `apply_migration` call was denied by the auto-mode permission classifier pending the repo owner's explicit go-ahead for a live schema change, obtained the same day. Applied via `supabase db push`; verified live via Supabase MCP `list_tables` (`parent_account_id` column present, nullable, FK `companies_parent_account_id_fkey` -> `companies.id`). |
| `0024_add_account_plans.sql` | 2026-07-06 | `account_plans` table (3 seeded tiers: Bronze/Silver/Gold, `job_slot_limit`/`cse_hours_included`/`price_mmk`) + `companies.plan_id` FK (Layer 13, Plan Tiers & Usage Metering). Same approval situation as 0023, resolved the same day. Applied via `supabase db push`; verified live via `list_tables` (table present, RLS enabled, 3 rows, FK `companies_plan_id_fkey` -> `account_plans.id`) and `execute_sql` (seed prices confirmed as bronze=30000, silver=70000, gold=150000 MMK -- the repo owner's launch pricing, not the original placeholder zeros). `hasPlanCapacity()` still treats a company with no `plan_id` as unmetered, so existing accounts are unaffected until a plan is deliberately assigned via the Billing tab's Account Plans panel. Pricing is owner-editable there (`PATCH /api/account-plans/[id]`) without a redeploy. |
| `0025_add_feedback_consent.sql` | 2026-07-06 | `feedback.consent_to_feature`/`featured_status`/`reviewed_at`/`reviewed_by` (Layer 18, real testimonials) -- lets a candidate opt in and staff approve their interview feedback as a public homepage quote, replacing the hardcoded fake names/quotes that were live in `Testimonials.tsx`. Written on `feat/layer18-24-cto-roadmap` while the repo owner was away (explicitly not pushed live at the time, per the same "0023/0024 required explicit go-ahead" precedent); applied via `supabase db push` once that go-ahead arrived. Supabase MCP was unavailable this session (server never connected), so verified live instead via a direct `GET .../rest/v1/feedback?select=id,consent_to_feature,featured_status,reviewed_at,reviewed_by` REST call -- an empty-array (not error) response confirms all four columns exist and are queryable, matching the `supabase db query --linked` fallback pattern `0022` used for the same reason. `getFeaturedTestimonials()`/`listPendingTestimonials()` in `src/lib/db/feedback.ts` no longer need their empty-list fallback for a missing-column error, but it's left in place as harmless defence-in-depth. |
| `0026_add_payments.sql` | 2026-07-06 | `payments` table + `record_invoice_payment()` function (manual payment-reconciliation foundation; no live gateway wired -- Stripe unsupported in Myanmar, KBZPay/WavePay need owner-side merchant KYC, see `docs/superpowers/plans/2026-07-06-layer19-payment-collection-options.md`). |
| `0027_add_job_view_count.sql` | 2026-07-06 | `jobs.view_count` column (job posting view tracking). |
| `0028_add_company_featured.sql` | 2026-07-06 | `companies.is_featured` column (Featured Employer Placement, technical capability only -- plain staff-toggled boolean, no pricing/expiry logic yet; mirrors the existing `jobs.is_featured` pattern). |
| `0029_add_plan_upgrade_category.sql` | 2026-07-06 | Adds `'plan_upgrade'` to `system_events_category_check` -- **P0 fix**: Batch 2's Plan Upgrade Request Inbox (PR #89) shipped code (`FailureCategory` type, `POST /api/company-portal/plan-upgrade-request`) that inserts `category='plan_upgrade'` without ever adding it to this constraint, so every request from a company had been silently failing in production since merge (`appendSystemEvent()` only logs the DB error to console; the route still returned `200 {ok: true}` to the caller). Same pattern as `0015`'s `'rate_limit'` addition. Applied via Supabase MCP `execute_sql`, verified live by inserting and deleting a test `plan_upgrade` row directly against the constrained column. |

| `0030_add_featured_placement.sql` | 2026-07-06 | `companies.featured_until` (nullable timestamp) + `'featured_placement'` added to `system_events_category_check`. Self-Serve Featured Placement Upsell: turns `0028`'s technical-capability-only `is_featured` flag into a timed, paid placement via the portal-request -> staff-inbox -> approve-and-invoice -> paid-triggers-activation flow (same plumbing as Batch 2's Plan Upgrade Requests). `featured_until IS NULL` means "not on a timed placement," which deliberately also covers a company a staff member featured manually via the existing star-toggle (`updateCompanyFeatured`) -- the expiry sweep (`WHERE featured_until < now()`) never touches a manual toggle. Applied via Supabase MCP `execute_sql`, verified live via `information_schema.columns` and `pg_get_constraintdef`. |

| `0031_add_featured_placement_settings.sql` | 2026-07-06 | `agency_settings.featured_placement_price_mmk`/`featured_placement_duration_days` (owner-editable pricing, per explicit follow-up request on `0030`'s hardcoded-constant launch values). Reuses the existing `agency_settings` singleton row rather than a new table. Defaults (50000, 30) match the values already live since `0030`, so this is a pure schema addition with zero behavior change until an admin edits it via the Billing tab's `FeaturedPlacementSettingsPanel`. Applied via Supabase MCP `execute_sql`, verified live via `information_schema.columns` and a rolled-back test update. |
| `0032_add_job_boost.sql` | 2026-07-06 | `jobs.featured_until` (nullable timestamp) + `agency_settings.job_boost_price_mmk`/`job_boost_duration_days` (separate pricing from Featured Company Placement -- boosting one job is a narrower, independently-priced product) + `'job_boost'` added to `system_events_category_check`. Self-Serve Featured Job Listing Boost: `jobs.is_featured` (pre-existing) could previously only ever be set once, at creation via `PostJobForm`'s checkbox -- no manual toggle existed after the fact at all, unlike companies. This gives jobs the same timed-activation mechanism companies got in `0030`, scoped per posting. Applied via Supabase MCP `execute_sql`, verified live via `information_schema.columns` and `agency_settings` row read-back. |

> **Note (2026-07-06)**: `0026`–`0028` were applied live in earlier sessions the same day but never got a row in this table until `0029`'s hotfix session added them retroactively for a complete record.

> **Merge-order note (2026-07-05)**: this migration was originally numbered
> `0017_add_stats_history.sql`, written concurrently with
> `0017_add_role_permissions.sql` in a separate autonomous session against
> the same repo. Renumbered to `0018` (repo owner's explicit call) after
> the role_permissions migration merged to `main` first. Zero table/column
> overlap between the two, so this had no live-schema consequence either
> way — purely a filename/sequencing fix.

> **Merge-order note (2026-07-06)**: `0019_add_set_role_permission_function.sql`
> was originally numbered `0018_add_set_role_permission_function.sql`,
> written on a PR branch (#63) concurrently with the same-day
> `0018_add_stats_history.sql` on another branch in a separate session
> against the same repo. Renumbered to `0019` after the stats_history
> migration merged to `main` first. No table/column overlap between the
> two (one adds a function, the other a table), so this had no live-schema
> consequence — purely a filename/sequencing fix, same resolution as the
> note above.

> **Merge-order note (2026-07-04), resolved as predicted**: `0014` (PR #46)
> and `0015` (this branch) were branched and applied live independently
> and in parallel. Both migrations were already live and idempotent
> (guarded) before either PR merged, so DB state was correct regardless of
> merge order. PR #46 merged first as planned; this table's conflict on
> merging this branch was exactly the anticipated, no-real-content
> conflict (both rows kept, same resolution Phase 13/16 used for their own
> documented `PROGRESS.md` conflict).

> Note (2026-07-03): `0009`'s row previously read `2026-07-03`, one day
> earlier than `0008`'s `2026-07-04` directly above it, even though `0009`
> was applied after `0008` — a date-ordering typo introduced earlier in
> this same session, not inherited from before it. Corrected `0009` to
> `2026-07-04` (matching `0008`) and dated `0010` the same, so the table
> reads in non-decreasing date order. No other rows were touched.

The next migration is `0011_<short_description>.sql`. Keep the `IF NOT
EXISTS` / `ADD COLUMN IF NOT EXISTS` guards every file here already uses —
they're why re-running any of these four by accident is harmless.

## How to actually apply a migration right now (until CLI linking exists)

There is no `supabase/config.toml` in this repo — the project has never
been `supabase link`-ed, so `supabase db push` will not work yet (see
"Not done in this pass" below). Until it is, apply new migrations the same
verified way `0004` was applied:

1. Write the migration file here with the next `NNNN_` prefix, guarded with
   `IF NOT EXISTS` throughout.
2. Apply it — either paste into the Supabase dashboard's SQL Editor, or (if
   you're working with an agent that has the Supabase MCP tools connected)
   have it call `apply_migration` against project `gthewuhgrnnabyxkozvv`.
3. **Verify, don't assume**: call `list_tables` (or `list_migrations`) on
   the same project immediately after and confirm the new table/column is
   actually there with the expected shape. This is the step that was
   skipped nowhere this session and should never be skipped going forward
   — a migration that "should have worked" is not the same as one that's
   confirmed to have worked.
4. Update the table above with the new row.

## CLI linked and history repaired (2026-07-03)

The project is now linked and the history table matches reality:

```bash
npx supabase migration list
# {"local":"0001","remote":"0001",...} {"local":"0004","remote":"0004",...}
# {"local":"","remote":"20260630131708",...}   ← predates this file-based
#                                                 convention, no local file
#                                                 exists for it, left as-is
```

How it was actually done, for next time: the standard `npx supabase login`
browser OAuth flow **fails outright** in a non-interactive shell —
`LegacyLoginMissingTokenError: Cannot use automatic login flow inside
non-TTY environments`. The fix was a personal access token instead:

```bash
# 1. Generate a token at https://supabase.com/dashboard/account/tokens
# 2. Add it to .env.local: SUPABASE_ACCESS_TOKEN=sbp_...
# 3. Log in non-interactively:
npx supabase login --token "$SUPABASE_ACCESS_TOKEN"
# 4. Link (no DB password needed for this — only db pull/diff need it):
npx supabase link --project-ref gthewuhgrnnabyxkozvv
# 5. Reconcile history for migrations already live in production:
npx supabase migration repair --status applied --linked 0001 0002 0003 0004
```

`supabase link` also drops machine-local cache into `supabase/.temp/`
(project ref, pooler URL, version info — no secrets, but not portable
config either) — gitignored, do not commit it.

`supabase db push` is now the real way to apply a new migration; run
`supabase migration list` first to confirm it agrees with the table above
before pushing. The manual "paste into SQL Editor + verify with
list_tables" process from the previous section is no longer the primary
path, but keep it in mind as a fallback if the CLI is ever unavailable.

## `db push` proven end-to-end (0005/0006, 2026-07-03)

`db push` initially refused to run at all: `20260630131708` (the original
baseline) has no local file, and both `db push` and `db pull` treat that as
a conflict rather than something to silently tolerate. Fixed with (repo
owner's explicit approval obtained first — this rewrites production
migration bookkeeping):

```bash
npx supabase migration repair --status reverted 20260630131708
```

This only touches the bookkeeping table — no DDL runs, the original tables
are untouched — it just tells the CLI to stop expecting a local file for
that one entry, permanently. After that, `supabase db push` ran 0005 for
real (no DB password prompt needed) and `supabase migration list` now
shows local/remote agreeing on `0001`–`0006` with no dangling entries.

**Lesson learned, apply to every future migration**: `0005_add_staff.sql`
created the `staff` table without `ENABLE ROW LEVEL SECURITY` — the
Supabase advisor caught it immediately after applying (every other table
in this schema has RLS on; `staff` didn't). Not immediately exploitable
(this app only ever queries Supabase via the service-role key, server-side
only — grep `NEXT_PUBLIC_SUPABASE|createClient` under `src/` to confirm
nothing else touches it), but a real gap: anyone who ever obtained this
project's anon key could otherwise read/write staff emails and roles
directly via Supabase's REST API. Fixed forward in `0006` rather than
editing the already-applied `0005`. **Every `CREATE TABLE` from now on
must include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` in the same
migration** — check `list_tables`'s `rls_enabled` field on the new table
immediately after applying, every time, not just for staff.

## `0033_add_invoice_charge_type.sql` and `0034_scope_feedback_public_read_policy.sql` — both applied (2026-07-07)

Both written during the same CTO Technical Audit session and initially
held back pending the repo owner's explicit authorization (a live-
database change is a distinct, higher-risk category than a code change,
correctly blocked by this session's safety guardrail from running on a
general "execute the roadmap" delegation alone). The repo owner
returned, reviewed both, and explicitly authorized applying them.

- **`0033`** (Phase 5, invoice schema cleanup): adds `invoices.charge_type`
  (checked enum) + `invoices.metadata` (jsonb), replacing the old
  "regex-parse a tag out of `position`" convention across
  `db/invoices.ts`, `db/companies.ts`, `db/jobs.ts`, `db/revenue.ts`, and
  the three request-approve routes. Applied via the Supabase MCP
  `apply_migration` tool; verified live via `list_tables` (both columns
  present, correct CHECK constraint) and a direct `SELECT` confirming the
  one existing invoice backfilled to `charge_type = 'featured_placement'`,
  `metadata = {"durationDays": 30}`. Merged via PR #107.
- **`0034`** (Phase 4, RLS defense-in-depth): `feedback_public_read` had
  `USING (true)` — every feedback row readable by the anon role,
  including feedback never consented to be featured and rows still
  pending/rejected in moderation. Scoped to
  `featured_status = 'approved' AND consent_to_feature = true`, matching
  what `getFeaturedTestimonials()` already filters for. Applied via the
  Supabase MCP `apply_migration` tool; verified live via `pg_policies`
  (`qual` now shows the scoped condition). Merged via PR #111. Current
  app behavior was unaffected either way — this app only ever queries
  via the service-role key, which bypasses RLS entirely.
