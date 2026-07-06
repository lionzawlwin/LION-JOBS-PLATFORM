-- Featured Employer Placement (technical capability only). Mirrors the
-- existing jobs.is_featured pattern exactly (a plain staff-toggled boolean,
-- no pricing/expiry logic in code) -- this is the same mechanism at the
-- company level, not a new concept. What a "featured" placement costs and
-- which employers qualify is a commercial decision for the repo owner to
-- make off-platform; this migration only adds the on/off switch.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
