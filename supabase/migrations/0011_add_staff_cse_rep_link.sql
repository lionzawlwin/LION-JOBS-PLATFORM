-- Phase 10: link a cse-role staff login to a cse_reps row, so row-level
-- scoping has something to scope by. Nullable, no backfill — staff and
-- cse_reps are independent tables today with no shared key to infer a
-- match from (not even email is guaranteed to line up). Existing cse
-- staff rows get NULL and must be linked manually via Team & Access.
-- See docs/superpowers/specs/2026-07-04-phase-10-cse-row-scoping-design.md.

ALTER TABLE staff ADD COLUMN IF NOT EXISTS cse_rep_id TEXT REFERENCES cse_reps(id);
