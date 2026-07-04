-- Layer 1 of the Company Dashboard roadmap: a real company_id FK on jobs,
-- replacing the free-text company-name matching the Company Portal
-- (`/api/company-portal/me`) has relied on since Sprint 2. See
-- docs/superpowers/specs/2026-07-05-layer1-company-id-fk-design.md.
--
-- Additive and backfilled by exact name match. jobs.company (free text)
-- is kept unchanged -- it stays the source of truth for public job-board
-- display and the public /companies/[slug] SEO pages, which build their
-- own slugs directly from job postings and are intentionally unrelated
-- to CRM company identity (a company can have public job listings
-- without ever being a row in `companies`). Out of scope here.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id TEXT REFERENCES companies(id);

UPDATE jobs
SET company_id = companies.id
FROM companies
WHERE jobs.company = companies.name
  AND jobs.company_id IS NULL;

CREATE INDEX IF NOT EXISTS jobs_company_id_idx ON jobs(company_id);
