-- Featured Placement pricing (0030) shipped as hardcoded constants
-- (FEATURED_PLACEMENT_PRICE_MMK / FEATURED_PLACEMENT_DURATION_DAYS in
-- src/lib/companyRules.ts) with an explicit note that it was a starting
-- guess needing owner confirmation. Per that follow-up, this makes it a
-- data write instead of a code change -- same reasoning as Account Plans'
-- price_mmk. Reuses the existing agency_settings singleton row rather
-- than a new table, matching that table's existing mix of legal AND
-- commercial defaults (e.g. defaultCommissionRatePct already lives here).
-- Defaults match the values already live since 0030 so this is a pure
-- schema addition with zero behavior change until an admin edits it.
ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS featured_placement_price_mmk NUMERIC NOT NULL DEFAULT 50000,
  ADD COLUMN IF NOT EXISTS featured_placement_duration_days INTEGER NOT NULL DEFAULT 30;
