-- Adds 'rate_limit' as a valid system_events.category so blocked requests
-- (checkRateLimit() returning allowed:false) can be persisted and counted
-- -- the in-memory limiter itself doesn't survive across serverless
-- invocations, so a live "how often is this actually engaging" question
-- needs a durable record (Phase 20's own deferred follow-up).
ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_category_check;
ALTER TABLE system_events ADD CONSTRAINT system_events_category_check
  CHECK (category = ANY (ARRAY['webhook'::text, 'ai_scoring'::text, 'invoicing'::text, 'cron'::text, 'other'::text, 'rate_limit'::text]));
