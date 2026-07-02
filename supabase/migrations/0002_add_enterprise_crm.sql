-- B2B Enterprise CRM: companies extension + contracts/interactions/cse_reps
-- Apply via the process in supabase/MIGRATIONS.md, then verify.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'smb';

-- Existing 'Client' rows become 'Active' under the expanded status set
-- ('Lead' | 'Active' | 'In-Contract' | 'Inactive').
UPDATE companies SET status = 'Active' WHERE status = 'Client';

CREATE TABLE IF NOT EXISTS cse_reps (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contracts (
  id            TEXT PRIMARY KEY,
  company_id    TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  value         NUMERIC NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'MMK',
  contract_type TEXT NOT NULL DEFAULT 'Retainer',
  status        TEXT NOT NULL DEFAULT 'Draft',
  start_date    DATE,
  end_date      DATE,
  cse_id        TEXT REFERENCES cse_reps(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interactions (
  id                TEXT PRIMARY KEY,
  company_id        TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  note              TEXT NOT NULL,
  logged_by_cse_id  TEXT REFERENCES cse_reps(id) ON DELETE SET NULL,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_cse_id ON contracts(cse_id);
CREATE INDEX IF NOT EXISTS idx_interactions_company_id ON interactions(company_id);
