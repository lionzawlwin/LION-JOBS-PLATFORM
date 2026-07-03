-- Phase 8 follow-up: 0009's composite index only matched getCronStatus()'s
-- query shape (category + route + created_at). listSystemEvents() never
-- filters by route, and always filters by level='error' first — neither
-- index from 0009 covered that shape. Fix forward rather than editing the
-- already-applied 0009 (see MIGRATIONS.md's staff-table RLS lesson for why
-- this repo does it this way).
DROP INDEX IF EXISTS idx_system_events_created_at;
CREATE INDEX IF NOT EXISTS idx_system_events_level_category_created_at
  ON system_events (level, category, created_at DESC);
