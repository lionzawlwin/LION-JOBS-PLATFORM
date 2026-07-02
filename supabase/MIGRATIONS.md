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

The next migration is `0005_<short_description>.sql`. Keep the `IF NOT
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

## Not done in this pass — a real follow-up, not a silent gap

Properly closing this requires:

```bash
npx supabase login                                   # interactive browser auth
npx supabase link --project-ref gthewuhgrnnabyxkozvv  # links this repo to the real project
npx supabase migration repair --status applied \
  20260630131708 0001 0002 0003 0004                  # marks history-table state to match reality
```

This needs your own interactive login (the CLI opens a browser) — it can't
be done headlessly in an agent session, which is why it's written down here
as a next step instead of attempted. Once linked, `supabase db push`
becomes the real apply command, `supabase migration list` becomes the real
source of truth, and the manual "paste + verify" process above can retire.
