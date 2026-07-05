-- Run this in Supabase SQL Editor once, or apply via Supabase MCP apply_migration.
-- Daily aggregate snapshots for dashboard trend charts (CTO advisory Layer 5).
--
-- Originally numbered 0017; renumbered to 0018 (repo owner's call,
-- 2026-07-05) after 0017_add_role_permissions.sql merged to main first.
-- Zero table/column overlap between the two either way.

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
