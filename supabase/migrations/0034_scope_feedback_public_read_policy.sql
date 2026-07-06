-- CTO Technical Audit Phase 4: RLS defense-in-depth. Investigated the
-- audit's own claim that "RLS is cosmetic" and found it's only true of
-- the *service-role* key (expected -- service_role always bypasses RLS
-- in Supabase, and that's the only key this app's server-side code
-- uses). For the *anon* key -- which this app doesn't currently use
-- client-side, but a leaked anon key or a future client-side Supabase
-- call would rely on -- the actual policy inventory (pg_policies) shows
-- most tables are already correctly protected: 16 tables have RLS
-- enabled with zero policies, which Postgres treats as deny-all by
-- default (no fix needed there), and of the 8 tables with explicit
-- policies, 7 are already correctly scoped (deny-all on
-- applications/b2b_leads/candidates/companies/subscribers; public SELECT
-- on jobs -- correct, that's the entire point of the job board; public
-- INSERT on feedback -- correct, that's the public feedback-submission
-- form).
--
-- The one real gap: `feedback_public_read` (added when feedback.ts's
-- getFeaturedTestimonials()/listPendingTestimonials() were built) has
-- `USING (true)` -- unconditional SELECT on every row, including
-- feedback a candidate never consented to have featured
-- (consent_to_feature = false) and rows still awaiting/rejected in
-- moderation (featured_status != 'approved'). The service-role client
-- this app actually uses doesn't need this policy to grant anything
-- (it bypasses RLS entirely) -- but if the anon key were ever used or
-- leaked, this policy alone would hand over every candidate's raw
-- interview feedback text, not just the moderated/consented subset the
-- application layer intends to expose. Tightening it to match exactly
-- what getFeaturedTestimonials() already filters for is a pure
-- narrowing -- current app behavior (service-role, bypasses RLS
-- anyway) is completely unaffected.
DROP POLICY IF EXISTS feedback_public_read ON feedback;
CREATE POLICY feedback_public_read ON feedback
  FOR SELECT
  USING (featured_status = 'approved' AND consent_to_feature = true);
