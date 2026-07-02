-- AI CV Scoring columns on applications table
-- Apply via the process in supabase/MIGRATIONS.md, then verify.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_score        SMALLINT,
  ADD COLUMN IF NOT EXISTS ai_summary      TEXT,
  ADD COLUMN IF NOT EXISTS ai_reasoning    TEXT,
  ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;
