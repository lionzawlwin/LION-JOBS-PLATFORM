-- Layer 13: Plan Tiers & Usage Metering. account_plans is a small, mostly-
-- static lookup table (3 seed tiers); companies.plan_id is nullable so
-- every existing company is unaffected (null = no plan assigned = no
-- gating anywhere hasPlanCapacity() is checked -- see src/lib/db/accountPlans.ts).
CREATE TABLE IF NOT EXISTS account_plans (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  job_slot_limit     INTEGER,           -- NULL = unlimited
  cse_hours_included NUMERIC,
  price_mmk          NUMERIC,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE account_plans ENABLE ROW LEVEL SECURITY;

-- Launch pricing set by the repo owner (2026-07-06). Editable afterwards
-- via PATCH /api/account-plans/[id] (Manage Pricing control in the
-- Account Plans panel) -- never redeploy code to change a price.
INSERT INTO account_plans (id, name, job_slot_limit, cse_hours_included, price_mmk) VALUES
  ('plan-bronze', 'Bronze', 5,    2, 30000),
  ('plan-silver', 'Silver', 15,   6, 70000),
  ('plan-gold',   'Gold',   NULL, 20, 150000)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan_id TEXT REFERENCES account_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS companies_plan_id_idx ON companies(plan_id);
