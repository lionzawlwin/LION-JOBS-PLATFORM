-- Direct-Contact-Info Upsell Tier (design spec:
-- docs/superpowers/specs/2026-07-07-direct-contact-unlock-tier-design.md,
-- confirmed by the repo owner: 5,000 MMK per unlock, consent captured at
-- the final step of the application form, retroactive unlock allowed for
-- historical applications). One row per (application, company) --
-- prevents double-charging the same unlock, a gap this repo's own
-- billing subsystem left open on `invoices.application_id` and explicitly
-- logged as an accepted follow-up; doing it right from the start here
-- since it's a net-new table.
CREATE TABLE IF NOT EXISTS contact_unlocks (
  id             TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  company_id     TEXT NOT NULL REFERENCES companies(id),
  invoice_id     TEXT REFERENCES invoices(id),
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'revoked')),
  unlocked_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE contact_unlocks ENABLE ROW LEVEL SECURITY; -- MIGRATIONS.md's hard-learned lesson: every CREATE TABLE needs this in the same migration
CREATE UNIQUE INDEX IF NOT EXISTS contact_unlocks_application_company_uq
  ON contact_unlocks (application_id, company_id);
CREATE INDEX IF NOT EXISTS idx_contact_unlocks_company_id ON contact_unlocks (company_id);

-- Owner-editable price, same pattern as featured_placement_price_mmk /
-- job_boost_price_mmk. No duration column -- unlike Featured Placement/
-- Job Boost, an unlock doesn't expire.
ALTER TABLE agency_settings
  ADD COLUMN IF NOT EXISTS contact_unlock_price_mmk INTEGER NOT NULL DEFAULT 5000;

-- Same additive pattern as 0033's charge_type values before it.
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_charge_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_charge_type_check
  CHECK (charge_type = ANY (ARRAY['candidate_placement'::text, 'plan_upgrade'::text, 'featured_placement'::text, 'job_boost'::text, 'contact_unlock'::text]));

-- Same pattern as 0015/0029/0030/0032 -- a new system_events category for
-- routing contact-unlock requests to the Billing tab's staff inbox.
ALTER TABLE system_events DROP CONSTRAINT IF EXISTS system_events_category_check;
ALTER TABLE system_events ADD CONSTRAINT system_events_category_check
  CHECK (category = ANY (ARRAY['webhook'::text, 'ai_scoring'::text, 'invoicing'::text, 'cron'::text, 'other'::text, 'rate_limit'::text, 'plan_upgrade'::text, 'featured_placement'::text, 'job_boost'::text, 'contact_unlock'::text]));
