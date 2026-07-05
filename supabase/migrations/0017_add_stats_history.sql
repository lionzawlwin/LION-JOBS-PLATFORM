-- Run this in Supabase SQL Editor once, or apply via Supabase MCP apply_migration.
-- Daily aggregate snapshots for dashboard trend charts (CTO advisory Layer 5).
--
-- NOTE ON NUMBERING: a concurrent branch (dynamic RBAC / role_permissions)
-- also claimed 0017 around the same time this was written. This table has
-- zero overlap with that work (no shared columns/objects), so apply order
-- doesn't matter functionally -- but whichever merges second should renumber
-- to keep the sequence unique, per supabase/MIGRATIONS.md's convention.

CREATE TABLE IF NOT EXISTS stats_history (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date      date NOT NULL UNIQUE,
  jobs_count         integer NOT NULL DEFAULT 0,
  candidates_count   integer NOT NULL DEFAULT 0,
  companies_count    integer NOT NULL DEFAULT 0,
  hired_count        integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stats_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS stats_history_snapshot_date_idx ON stats_history (snapshot_date DESC);
