-- Self-Serve Featured Placement Upsell. Featured Employer Placement
-- (0028) was technical-capability-only: a plain staff-toggled boolean
-- with no pricing/expiry logic. This adds the timed, paid path: an
-- employer requests it from their portal, staff approve and invoice it
-- (reusing the Batch 2 plan-upgrade request/inbox/invoice plumbing), and
-- once the invoice is marked Paid, companies.is_featured flips on for a
-- fixed duration and expires automatically -- see
-- FEATURED_PLACEMENT_DURATION_DAYS in src/lib/companyRules.ts.
--
-- NULL featured_until means "not on a timed placement" -- covers both a
-- company that's never been featured and one a staff member featured
-- manually via the existing star-toggle (updateCompanyFeatured), so the
-- expiry sweep (WHERE featured_until < now()) never touches a manual
-- toggle.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- Same pattern as 0015 ('rate_limit') and 0029 ('plan_upgrade') -- a new
-- system_events category for routing featured-placement requests to the
-- Billing tab's staff inbox.
ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_category_check;
ALTER TABLE system_events ADD CONSTRAINT system_events_category_check
  CHECK (category = ANY (ARRAY['webhook'::text, 'ai_scoring'::text, 'invoicing'::text, 'cron'::text, 'other'::text, 'rate_limit'::text, 'plan_upgrade'::text, 'featured_placement'::text]));
