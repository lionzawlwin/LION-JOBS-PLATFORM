-- API/route health page (item #4 of the 2026-07-07 CTO big-upgrades
-- portfolio, "Design decided" section of
-- docs/superpowers/specs/2026-07-07-cto-big-upgrades-portfolio.md).
--
-- Deliberately a NEW table, not a system_events reuse: system_events is
-- error-only semantics (see FailureCategory/logFailure in
-- src/lib/observability.ts) and would be polluted with successful-request
-- noise if a periodic synthetic health ping wrote its "still healthy"
-- samples there. This table exists solely to record latency/status
-- samples from that periodic check -- see src/lib/apiHealthCheck.ts.
--
-- NOTE (merge-order): numbered 0038 because a concurrent, not-yet-merged
-- session on branch feat/job-alert-subscriptions already claimed 0037 for
-- a job_alert_subscriptions table (not visible in this worktree's local
-- migrations/ listing). This number may need renumbering at merge time
-- depending on which branch lands on main first -- same known,
-- acceptable collision point as the 0017/0018 and 0018/0019 renumbering
-- notes already in supabase/MIGRATIONS.md. Zero table/column overlap
-- with job_alert_subscriptions either way, so no live-schema consequence
-- regardless of merge order.
--
-- PREPARED, NOT APPLIED: do not run `supabase db push` for this file
-- without the repo owner's explicit go-ahead, per this repo's established
-- live-migration discipline (see supabase/MIGRATIONS.md).

CREATE TABLE IF NOT EXISTS api_health_checks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route       text NOT NULL,
  latency_ms  integer NOT NULL,
  status      text NOT NULL CHECK (status IN ('ok', 'fail')),
  checked_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api_health_checks ENABLE ROW LEVEL SECURITY;

-- Per-route history lookups (dashboard panel) and window-based cleanup
-- queries both filter/sort on checked_at, scoped to a route.
CREATE INDEX IF NOT EXISTS api_health_checks_route_checked_at_idx
  ON api_health_checks (route, checked_at DESC);

-- Un-scoped "everything in the last N hours" queries (getRecentApiHealthChecks).
CREATE INDEX IF NOT EXISTS api_health_checks_checked_at_idx
  ON api_health_checks (checked_at DESC);
