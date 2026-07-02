-- Enable RLS on staff, matching every other table in this schema.
-- Apply via the process in supabase/MIGRATIONS.md, then verify.
--
-- No policies added deliberately: this app only ever accesses Supabase via
-- the service role key (src/lib/supabase.ts, server-side only), which
-- bypasses RLS regardless of policies. Zero policies means the table is
-- fully locked to service-role-only access — nothing else should ever be
-- able to read or write it, and nothing in this app needs to.

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
