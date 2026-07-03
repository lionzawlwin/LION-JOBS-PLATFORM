-- Phase 7: track when a B2B lead's status last changed, not just when it
-- was submitted, so "stuck in the pipeline" can be measured accurately
-- (previously only submitted_at existed, which conflates "old" with
-- "hasn't moved").
ALTER TABLE b2b_leads ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;
UPDATE b2b_leads SET status_updated_at = submitted_at WHERE status_updated_at IS NULL;
ALTER TABLE b2b_leads ALTER COLUMN status_updated_at SET DEFAULT now();
ALTER TABLE b2b_leads ALTER COLUMN status_updated_at SET NOT NULL;
