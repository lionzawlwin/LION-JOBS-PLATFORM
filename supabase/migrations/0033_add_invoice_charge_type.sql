-- CTO Technical Audit Phase 5: invoices has grown four charge types
-- (candidate placement, plan upgrade, featured placement, job boost),
-- all distinguished only by parsing a tag out of the free-text
-- `position` column (companyRules.ts/jobRules.ts's parse*() functions,
-- plus an inline 'Plan Upgrade — ' prefix check in db/revenue.ts). That
-- was a reasonable way to avoid a schema change for the second charge
-- type; four deep, the regex-parsing is itself the debt. This adds a
-- real discriminator column plus a structured payload instead.
--
-- `position` is kept as-is -- it's still the human-readable line item
-- text shown on invoices/printouts -- this just stops it being the only
-- source of truth for what kind of charge a row is.
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS charge_type TEXT NOT NULL DEFAULT 'candidate_placement'
    CHECK (charge_type = ANY (ARRAY['candidate_placement'::text, 'plan_upgrade'::text, 'featured_placement'::text, 'job_boost'::text])),
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Backfill: same detection order/logic getRevenueSummary() already uses
-- to bucket paid invoices, applied once to existing rows. Any row that
-- doesn't match one of the three tagged patterns keeps the column
-- default (candidate_placement), which is correct -- that's exactly the
-- "else" bucket the runtime code already treats as candidate-placement.
UPDATE invoices
SET charge_type = 'plan_upgrade',
    metadata = jsonb_build_object('planName', substring(position from length('Plan Upgrade — ') + 1))
WHERE position LIKE 'Plan Upgrade — %';

UPDATE invoices
SET charge_type = 'featured_placement',
    metadata = jsonb_build_object('durationDays', (regexp_match(position, '^Featured Placement — (\d+) days$'))[1]::int)
WHERE position ~ '^Featured Placement — \d+ days$';

UPDATE invoices
SET charge_type = 'job_boost',
    metadata = jsonb_build_object(
      'jobId',        (regexp_match(position, '^Job Boost — .+ \[([^\]]+)\] \((\d+) days\)$'))[1],
      'durationDays', ((regexp_match(position, '^Job Boost — .+ \[([^\]]+)\] \((\d+) days\)$'))[2])::int
    )
WHERE position ~ '^Job Boost — .+ \[([^\]]+)\] \((\d+) days\)$';
