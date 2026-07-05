-- Layer 4 of the Company Dashboard roadmap: job_requests table. Company
-- Portal users submit a job posting request instead of writing directly
-- to the public `jobs` table; every request requires staff review before
-- it becomes a live listing (repo owner decision, 2026-07-05 -- no tier
-- gets auto-publish). See
-- docs/superpowers/specs/2026-07-05-layer4-job-request-center-design.md.
CREATE TABLE IF NOT EXISTS job_requests (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES companies(id),
  title          TEXT NOT NULL,
  location       TEXT NOT NULL,
  category       TEXT NOT NULL,
  type           TEXT NOT NULL,
  salary_min     INTEGER NOT NULL DEFAULT 0,
  salary_max     INTEGER NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'MMK',
  description    TEXT NOT NULL,
  requirements   TEXT[] NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  rejection_note TEXT
);
ALTER TABLE job_requests ENABLE ROW LEVEL SECURITY;
-- No policies, matching every other table's service-role-only access
-- pattern (see 0006_enable_staff_rls.sql's precedent).

CREATE INDEX IF NOT EXISTS job_requests_company_idx ON job_requests (company_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS job_requests_status_idx  ON job_requests (status, submitted_at DESC);
