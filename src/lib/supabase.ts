import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — DB calls will fail.');
}

// Use placeholder values when env vars are missing so createClient() doesn't
// throw during Next.js build-time page-data collection. Actual DB calls will
// fail gracefully (caught by callers) if the placeholders are used.
// Use || not ?? — Vercel can store env vars as empty strings which ?? won't catch.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-service-role-key',
  { auth: { persistSession: false } },
);
