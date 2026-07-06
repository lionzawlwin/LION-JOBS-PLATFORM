-- Layer 18: real testimonials, replacing the hardcoded fake names/quotes
-- that were live on the public homepage (src/components/landing/Testimonials.tsx).
--
-- Adds an opt-in consent + moderation layer directly on the existing
-- `feedback` table (candidate interview feedback, already captures a
-- 1-5 rating and a free-text quote) instead of creating a parallel
-- testimonials table -- this is real candidate data already being
-- collected, it just was never consented for public display before.
--
-- Fail-closed by design: every existing row and every new submission
-- that doesn't explicitly opt in defaults to consent_to_feature = false
-- and featured_status = 'not_requested', so nothing becomes publicly
-- visible without both (a) the candidate's explicit consent and
-- (b) a staff member approving it via the Content tab.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS consent_to_feature BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS featured_status TEXT NOT NULL DEFAULT 'not_requested'
  CHECK (featured_status IN ('not_requested', 'pending', 'approved', 'rejected'));
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

CREATE INDEX IF NOT EXISTS feedback_featured_status_idx ON feedback(featured_status);
