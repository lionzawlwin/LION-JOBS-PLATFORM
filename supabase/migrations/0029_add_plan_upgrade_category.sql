-- Batch 2's Plan Upgrade Request Inbox (PR #89) ships code that inserts
-- system_events rows with category='plan_upgrade' (src/types/index.ts's
-- FailureCategory, src/app/api/company-portal/plan-upgrade-request/route.ts)
-- but no migration ever added 'plan_upgrade' to this constraint -- every
-- such insert has been silently failing in production since merge
-- (appendSystemEvent() only console.error()s the DB error; the route still
-- returns 200 to the caller). Same pattern as 0015's 'rate_limit' addition.
ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_category_check;
ALTER TABLE system_events ADD CONSTRAINT system_events_category_check
  CHECK (category = ANY (ARRAY['webhook'::text, 'ai_scoring'::text, 'invoicing'::text, 'cron'::text, 'other'::text, 'rate_limit'::text, 'plan_upgrade'::text]));
