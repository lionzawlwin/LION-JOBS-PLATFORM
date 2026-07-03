-- Phase 5: local record of failures + cron heartbeats for the System
-- Health dashboard tab. Sentry (see src/lib/observability.ts) is the
-- source of truth for full exception detail; this table exists so the
-- dashboard doesn't depend on a live Sentry API call at page-load time.

CREATE TABLE IF NOT EXISTS system_events (
  id         TEXT PRIMARY KEY,
  category   TEXT NOT NULL CHECK (category IN ('webhook', 'ai_scoring', 'invoicing', 'cron', 'other')),
  level      TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'info')),
  route      TEXT NOT NULL,
  message    TEXT NOT NULL,
  context    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
