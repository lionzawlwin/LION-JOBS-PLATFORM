-- Layer 12: Multi-Brand Account Grouping. Additive, nullable, self-
-- referencing FK -- every existing company defaults to standalone (null
-- parent = today's exact behavior, unaffected). Lets a parent/child rollup
-- exist for multi-brand or multi-location clients (starting with the repo
-- owner's own F&B brands) without touching any existing company row.
-- See docs/superpowers/plans/... roadmap Layer 12.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS parent_account_id TEXT REFERENCES companies(id) ON DELETE SET NULL;

-- Plain ADD CONSTRAINT has no IF NOT EXISTS form in Postgres; guard via
-- pg_constraint the same way 0015 guarded a CHECK-constraint rewrite.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_parent_account_id_not_self'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_parent_account_id_not_self CHECK (parent_account_id IS NULL OR parent_account_id <> id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS companies_parent_account_id_idx ON companies(parent_account_id);
