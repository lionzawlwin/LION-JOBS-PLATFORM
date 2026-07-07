-- Fast-Track Visibility opt-in campaign (2026-07-07). Tracks, per
-- candidate (not per application -- a candidate with several historical
-- applications should get ONE campaign email, not one per application;
-- clicking the link grants consent for all of their applications that
-- lack it), whether the one-time backfill email has already been sent,
-- so re-running the campaign trigger never double-emails the same
-- candidate.
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS direct_contact_optin_campaign_sent_at TIMESTAMPTZ;
