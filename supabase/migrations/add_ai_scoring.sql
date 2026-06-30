-- AI CV Scoring columns on applications table
-- Run this in Supabase SQL Editor once.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS ai_score        SMALLINT,
  ADD COLUMN IF NOT EXISTS ai_summary      TEXT,
  ADD COLUMN IF NOT EXISTS ai_reasoning    TEXT,
  ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ;
