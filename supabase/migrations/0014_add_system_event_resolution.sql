-- Adds resolved-state tracking to system_events, so a fixed problem can be
-- marked resolved instead of showing as an active failure for up to 7 days
-- (listSystemEvents()'s default window). NULL = still unresolved; every
-- existing row is untouched and reads as unresolved by default.
ALTER TABLE system_events ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE system_events ADD COLUMN IF NOT EXISTS resolved_by TEXT;

CREATE INDEX IF NOT EXISTS system_events_resolved_at_idx
  ON system_events (resolved_at);
