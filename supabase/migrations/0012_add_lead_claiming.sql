-- Phase 15: B2B Leads assignment, Option A (Shared Pool) — repo owner's
-- explicit decision, see docs/superpowers/specs/2026-07-04-phase-15-leads-assignment-decision.md.
-- Every cse continues to see every lead (GET /api/leads stays unscoped,
-- no change there) -- this only adds a first-mover claim marker so two
-- CSEs don't duplicate outreach on the same lead. Nullable, no backfill:
-- existing leads start unclaimed.

ALTER TABLE b2b_leads ADD COLUMN IF NOT EXISTS claimed_by_cse_rep_id TEXT REFERENCES cse_reps(id);
ALTER TABLE b2b_leads ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
