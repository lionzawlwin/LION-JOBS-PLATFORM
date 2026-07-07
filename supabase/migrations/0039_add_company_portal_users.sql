-- Layer 1 of Module #1 (Enterprise Employer Console / multi-seat company
-- accounts), see docs/superpowers/specs/2026-07-05-layer9-portal-team-seats-design.md
-- for the original v1 design and the 2026-07-07 CTO big-upgrades portfolio
-- for why this was extended into a real per-seat RBAC model rather than
-- shipping Layer 9's "everyone sees identical data" version as-is.
--
-- The Company Portal today has exactly one login per company
-- (getCompanyByEmail matches the single companies.email column). This
-- table lets a company have multiple named logins, each with its own
-- seat_role, without changing anything for a company that never invites
-- anyone -- every existing company gets exactly one seeded 'owner' row
-- below, and portalAuth.ts's lookup (Layer 3, not built yet) falls back
-- to the legacy companies.email match if this table has no row for an
-- email, so this migration alone changes zero live behavior.
--
-- PREPARED, NOT APPLIED. Do not run `supabase db push` / apply_migration
-- for this file without the repo owner's explicit go-ahead -- same
-- pattern this repo has followed for every schema change since 0033
-- (see supabase/MIGRATIONS.md).

CREATE TABLE IF NOT EXISTS company_portal_users (
  id           TEXT PRIMARY KEY,
  company_id   TEXT NOT NULL REFERENCES companies(id),
  email        TEXT NOT NULL,
  name         TEXT,

  -- v1 seat roles for the portal-side RBAC matrix (Layer 2, not built
  -- yet): owner has full access incl. billing/team management;
  -- hiring_manager can manage job requests/applicants/contact-unlock but
  -- not billing or team; viewer is read-only across all portal domains.
  seat_role    TEXT NOT NULL DEFAULT 'owner'
               CHECK (seat_role IN ('owner', 'hiring_manager', 'viewer')),

  -- Self-referencing: NULL for the seeded owner row (nothing invited it),
  -- set to the inviting owner's row id for every seat added afterward.
  invited_by   TEXT REFERENCES company_portal_users(id),

  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('invited', 'active', 'revoked')),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE company_portal_users ENABLE ROW LEVEL SECURITY;
-- No policies -- service-role-only access, same as every other table in
-- this schema (see 0006_enable_staff_rls.sql's precedent/lesson-learned).

-- One seat per (company, email) -- prevents inviting the same address
-- twice for the same company; a person who works with two client
-- companies can still hold one seat at each.
CREATE UNIQUE INDEX IF NOT EXISTS company_portal_users_company_email_uq
  ON company_portal_users (company_id, email);

-- Used by the portal login lookup (Layer 3) to check this table by email
-- before falling back to companies.email.
CREATE INDEX IF NOT EXISTS company_portal_users_email_idx
  ON company_portal_users (email);

-- Used by the Team panel (Layer 5) to list a company's seats.
CREATE INDEX IF NOT EXISTS company_portal_users_company_id_idx
  ON company_portal_users (company_id);

-- Backfill: every existing company gets exactly one seeded 'owner' row
-- from its current single-login email, so nothing changes for a company
-- that never invites a second user. Deterministic id ('seed_' || company
-- id) rather than a generated one -- guaranteed unique per company and
-- makes this backfill trivially idempotent (ON CONFLICT DO NOTHING) if
-- this migration is ever re-run.
INSERT INTO company_portal_users (id, company_id, email, name, seat_role, status, invited_by, created_at)
SELECT
  'seed_' || c.id,
  c.id,
  c.email,
  c.contact_person,
  'owner',
  'active',
  NULL,
  now()
FROM companies c
WHERE c.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;
