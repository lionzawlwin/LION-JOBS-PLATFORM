-- Self-Serve Featured Job Listing Boost. jobs.is_featured (pre-existing)
-- could only ever be set once, at creation, via PostJobForm's checkbox --
-- there was no manual toggle after the fact at all (unlike companies,
-- which already had a star-toggle before the Featured Placement Upsell
-- was built). This adds the same timed-activation column companies got
-- in 0030, scoped to an individual job posting instead of a whole company.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- Separate price/duration from Featured Company Placement (0031) --
-- boosting one job posting is a narrower, independently-priced product,
-- not the same purchase. Same singleton agency_settings row, same
-- owner-editable-via-Settings-panel pattern.
ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS job_boost_price_mmk NUMERIC NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS job_boost_duration_days INTEGER NOT NULL DEFAULT 14;

-- Same pattern as 0015/0029/0030 -- a new system_events category for
-- routing job-boost requests to their own Billing tab staff inbox,
-- separate from the company-level 'featured_placement' category.
ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_category_check;
ALTER TABLE system_events ADD CONSTRAINT system_events_category_check
  CHECK (category = ANY (ARRAY['webhook'::text, 'ai_scoring'::text, 'invoicing'::text, 'cron'::text, 'other'::text, 'rate_limit'::text, 'plan_upgrade'::text, 'featured_placement'::text, 'job_boost'::text]));
