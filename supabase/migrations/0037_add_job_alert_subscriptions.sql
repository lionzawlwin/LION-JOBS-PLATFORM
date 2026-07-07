-- Job Alert Subscriptions (Item #2, CTO big-upgrades roadmap, see
-- docs/superpowers/specs/2026-07-07-cto-big-upgrades-portfolio.md
-- "Item #2 in more detail"). A candidate saves a search and gets emailed
-- a daily digest of newly-posted jobs matching it.
--
-- Search-criteria columns deliberately mirror getJobsPaginated()'s exact
-- filter params (src/lib/db/jobs.ts) -- keyword, category, type, location,
-- salary floor -- so the digest job can reuse that function's existing
-- query-pushdown filtering instead of inventing a second filtering
-- implementation. salary_max is intentionally not included: this feature
-- is framed as "alert me when a job appears" above a floor, not a ceiling.
--
-- Unlike portal_login_tokens (which stores only a SHA-256 hash because it
-- gates an authenticated session), unsubscribe_token here is a plain
-- opaque single-purpose capability token stored as-is -- clicking the
-- emailed link and deactivating the row is the entire threat surface,
-- there is no session/identity to protect beyond that.
--
-- PREPARED, NOT APPLIED. Do not run `supabase db push` for this file
-- without the repo owner's explicit go-ahead -- see supabase/MIGRATIONS.md
-- for why every schema change in this repo's recent history holds here
-- until that go-ahead arrives (same pattern as 0033/0034/0035/0036).

CREATE TABLE IF NOT EXISTS job_alert_subscriptions (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL,

  -- Search criteria -- mirrors getJobsPaginated()'s GetJobsPaginatedOptions
  -- shape exactly (all nullable/optional, same as that function's opts).
  keyword           TEXT,
  category          TEXT,
  type              TEXT,
  location          TEXT,
  salary_min        INTEGER,

  unsubscribe_token TEXT NOT NULL UNIQUE,
  active            BOOLEAN NOT NULL DEFAULT true,
  last_sent_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE job_alert_subscriptions ENABLE ROW LEVEL SECURITY;
-- No policies -- service-role-only access, same as every other table in
-- this schema (see 0006_enable_staff_rls.sql's precedent/lesson-learned).

-- Used by the daily digest cron to fetch only active subscriptions.
CREATE INDEX IF NOT EXISTS job_alert_subscriptions_active_idx
  ON job_alert_subscriptions (active)
  WHERE active = true;

-- Used to list/manage a candidate's own saved searches by email, if that
-- UI is ever added (not built in this pass -- see PR description).
CREATE INDEX IF NOT EXISTS job_alert_subscriptions_email_idx
  ON job_alert_subscriptions (email);
