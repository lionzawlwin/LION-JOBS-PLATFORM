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
