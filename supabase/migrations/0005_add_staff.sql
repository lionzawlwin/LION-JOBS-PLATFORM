-- Team & Access Control: staff roster with roles.
-- Apply via the process in supabase/MIGRATIONS.md, then verify.
--
-- Scope note: this migration and the API/UI built on it do NOT yet widen
-- who can log in to /dashboard. Every existing route still checks
-- session.user.email === ADMIN_EMAIL directly (33 files, grep for
-- ADMIN_EMAIL under src/ to confirm). Widening the login gate before those
-- routes are migrated to check this table would let a newly added staff
-- member log into a dashboard where almost every tab immediately 401s.
-- That migration is a deliberate follow-up, not done here.

CREATE TABLE IF NOT EXISTS staff (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'cse', 'viewer')),
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the current sole admin as the first owner row, so the roster
-- reflects reality from day one. Mirrors authOptions.ts's ADMIN_EMAIL
-- default — update this row (not just the env var) if that ever changes.
INSERT INTO staff (id, email, name, role, active)
VALUES ('staff-owner-seed', 'lionzawlwin@gmail.com', 'Lion Zawl Win', 'owner', true)
ON CONFLICT (email) DO NOTHING;
