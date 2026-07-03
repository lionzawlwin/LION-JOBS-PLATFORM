-- Phase 8: system_events (added in 0007) had zero indexes beyond its
-- primary key, despite being queried by category/route/level and a
-- created_at range/order on every System Health dashboard load
-- (listSystemEvents) and on every single cron invocation
-- (getCronStatus() runs one category+route+created_at query per cron
-- route, every day, from both job-alerts and weekly-email).
CREATE INDEX IF NOT EXISTS idx_system_events_category_route_created_at
  ON system_events (category, route, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at
  ON system_events (created_at DESC);
