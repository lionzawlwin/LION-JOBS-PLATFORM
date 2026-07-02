-- B2B Billing & Invoicing: final agreed salary on applications, invoices table.
-- Run this in Supabase SQL Editor once.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS final_agreed_salary NUMERIC;

-- company_id/application_id are nullable with ON DELETE SET NULL, and
-- company_name is snapshotted (not just company_id): an invoice is a
-- financial/accounting record that must remain intact and legible even if
-- the company or the placement's application row is later deleted — same
-- reasoning as candidate_consents in the Legal Docs subsystem.
CREATE TABLE IF NOT EXISTS invoices (
  id                  TEXT PRIMARY KEY,
  invoice_number      TEXT NOT NULL UNIQUE,
  company_id          TEXT REFERENCES companies(id) ON DELETE SET NULL,
  company_name        TEXT NOT NULL,
  application_id      TEXT REFERENCES applications(id) ON DELETE SET NULL,
  candidate_name      TEXT NOT NULL,
  position            TEXT NOT NULL,
  agreed_salary       NUMERIC NOT NULL,
  commission_rate_pct NUMERIC NOT NULL,
  commission_fee_mmk  NUMERIC NOT NULL,
  status              TEXT NOT NULL DEFAULT 'Draft',
  issued_at           DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_application_id ON invoices(application_id);
