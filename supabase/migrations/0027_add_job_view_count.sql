-- Employer Self-Serve Analytics already exists (company-portal/me route's
-- `insights`/`applicantCounts`, rendered in CompanyPortalClientImpl.tsx --
-- Layer 3/14) but has no top-of-funnel number: employers see applicants per
-- stage, never how many people viewed the listing in the first place. This
-- adds that one missing metric.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Atomic increment -- a plain SELECT-then-UPDATE from the JS client would
-- lose counts under concurrent page views; a single UPDATE statement does not.
CREATE OR REPLACE FUNCTION increment_job_view_count(p_job_id text)
RETURNS void AS $$
BEGIN
  UPDATE jobs SET view_count = view_count + 1 WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;
