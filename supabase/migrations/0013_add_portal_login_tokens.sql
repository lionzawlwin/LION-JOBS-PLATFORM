-- Sprint 2 (Phases 23/24): shared magic-link login tokens for the new
-- Company Portal and Candidate Portal. One table serves both subject
-- types (discriminated by subject_type) rather than two near-identical
-- tables, since the token lifecycle (issue, single-use consume, expire)
-- is identical for both. See docs/superpowers/specs/2026-07-04-sprint-2-portal-auth-design.md.
--
-- Only the raw token's SHA-256 hash is ever stored -- the raw token
-- itself exists only in the emailed link and is never persisted,
-- following the standard password-reset-token security pattern.

CREATE TABLE IF NOT EXISTS portal_login_tokens (
  token_hash   TEXT PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('company', 'candidate')),
  subject_id   TEXT NOT NULL,
  email        TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE portal_login_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_portal_login_tokens_expires ON portal_login_tokens (expires_at);
