-- Payment Reconciliation Foundation. Today "marking an invoice Paid" is a
-- bare status-dropdown change on BillingView.tsx with no record of amount,
-- method, or who confirmed it -- this adds an actual payment record, and a
-- webhook-ready shape for a future payment-gateway confirmation to land in
-- (see docs/superpowers/plans/2026-07-06-layer19-payment-collection-options.md
-- for why no live gateway is wired yet: Stripe doesn't support Myanmar
-- merchants, and KBZPay/WavePay both require owner-side merchant KYC this
-- session can't do). This migration only adds manual-reconciliation
-- capability -- no external API calls anywhere in this file's code paths.
--
-- RLS enabled per the staff-table lesson in supabase/MIGRATIONS.md (every
-- CREATE TABLE from now on must enable it in the same migration).

CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  invoice_id    TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount_mmk    NUMERIC NOT NULL,
  method        TEXT NOT NULL DEFAULT 'bank_transfer',
  paid_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by   TEXT NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

-- Atomic write path: same reasoning as set_role_permission (migration 0019)
-- -- a payment record and its invoice's status flip to 'Paid' must never
-- land separately, even if the process crashes mid-write.
CREATE OR REPLACE FUNCTION record_invoice_payment(
  p_payment_id  text,
  p_invoice_id  text,
  p_amount_mmk  numeric,
  p_method      text,
  p_paid_at     date,
  p_recorded_by text,
  p_notes       text
) RETURNS text AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM invoices WHERE id = p_invoice_id FOR UPDATE) THEN
    RAISE EXCEPTION 'No invoice with id %', p_invoice_id;
  END IF;

  INSERT INTO payments (id, invoice_id, amount_mmk, method, paid_at, recorded_by, notes)
  VALUES (p_payment_id, p_invoice_id, p_amount_mmk, p_method, p_paid_at, p_recorded_by, p_notes);

  UPDATE invoices SET status = 'Paid' WHERE id = p_invoice_id;

  RETURN p_payment_id;
END;
$$ LANGUAGE plpgsql;
