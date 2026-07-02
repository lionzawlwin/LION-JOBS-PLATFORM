-- Legal Docs subsystem: agency settings, per-company commission override,
-- candidate interview details, and anti-bypass consent records.
-- Run this in Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS agency_settings (
  id                              TEXT PRIMARY KEY DEFAULT 'default',
  default_commission_rate_pct     NUMERIC NOT NULL DEFAULT 60,
  default_guarantee_days          INTEGER NOT NULL DEFAULT 60,
  default_replacement_cost_mmk    INTEGER NOT NULL DEFAULT 0,
  anti_bypass_penalty_mmk         INTEGER NOT NULL DEFAULT 500000,
  anti_bypass_restriction_months  INTEGER NOT NULL DEFAULT 12,
  terms_version                   TEXT NOT NULL DEFAULT 'v1',
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single settings row so getAgencySettings() always finds one.
INSERT INTO agency_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS commission_rate_pct NUMERIC;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS interview_location TEXT,
  ADD COLUMN IF NOT EXISTS interviewer_contact TEXT;

CREATE TABLE IF NOT EXISTS candidate_consents (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  consent_type   TEXT NOT NULL DEFAULT 'anti_bypass',
  terms_version  TEXT NOT NULL,
  agreed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address     TEXT,
  user_agent     TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidate_consents_application_id ON candidate_consents(application_id);
