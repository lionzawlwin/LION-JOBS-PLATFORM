# Layer 19 — payment collection: options, not code

## Why this is a decision doc, not a scaffold

The CTO roadmap's Layer 19 was "payment gateway groundwork." The obvious
default -- Stripe -- **does not support Myanmar merchants at all**
(confirmed via web search 2026-07-06: Myanmar is absent from Stripe's
~46 supported countries due to regulatory restrictions, not a technical
gap). Writing Stripe integration code against billing/`account_plans`
tonight, while the repo owner is away and can't correct course, would
have produced code that has to be thrown away rather than useful
groundwork -- the opposite of the CFO mandate's "token efficiency as
scarce capital" guardrail. So this session did the research and stopped
short of code, deliberately.

## What actually exists today

- `account_plans` (migration `0024`) + `invoices` (migration `0004`)
  already track plan tier, usage, and invoice records with real MMK
  pricing (Bronze/Silver/Gold, owner-editable via the Billing tab).
- `InvoiceDocument.tsx` generates a PDF (jspdf/html2canvas). There is no
  code anywhere that collects payment -- invoices are informational
  documents today, reconciled manually (email + bank transfer,
  presumably).

## Realistic options for a Myanmar MMK B2B agency

| Option | Fit | Friction |
|---|---|---|
| **KBZPay merchant integration** | Myanmar's largest mobile wallet (3.5M+ users, 230k+ merchants) | Requires registering with the KBZ Pay Team directly (their own merchant-integration form) to get an APP ID/Key/Merchant Code -- a business KYC process only the repo owner can start, not something achievable from this session |
| **Wave Money (WavePay)** | Second-largest, strong rural/agent-network reach | Same kind of merchant-onboarding requirement |
| **MPU** (Myanmar Payment Union) | Local card network | Typically integrated via a bank or aggregator, not directly |
| **Aggregator (e.g. A-Pay)** | One API surface for multiple Myanmar rails (KBZPay/WavePay/cards) instead of integrating each separately | Third-party dependency, own fees/contract to evaluate |
| **Stay manual** (bank transfer + staff-reconciled invoice) | Zero integration risk, works today | Doesn't reduce collection latency -- the actual CFO-flagged problem |

International processors (Stripe, PayPal Checkout, Adyen) are not
realistic primary options given the Myanmar-merchant restriction above --
only relevant if this business incorporates a foreign entity specifically
to process payments, which is a much bigger decision than a code layer.

## What Layer 19 needs from the repo owner before any code gets written

1. Which rail(s) to integrate -- likely KBZPay + WavePay at minimum,
   given their combined market share, possibly via an aggregator to
   avoid maintaining two separate merchant integrations.
2. Completed merchant registration with that provider (APP ID/Key/
   Merchant Code or aggregator credentials) -- this is a business
   process with real KYC/paperwork, not something automatable.
3. A decision on where payment status should live: a `payments` table
   linked to `invoices`, or a `status`/`paid_at` column added directly to
   `invoices` (migration TBD, same "write it, don't apply it live without
   go-ahead" process as `0025` this session).

Once those three exist, the actual integration (webhook handler for
payment confirmation, a "Pay Now" link/QR on the invoice, `invoices`
status transition, System Health integrations-status entry matching the
Layer 21 GA4 pattern) is a normal, boundable Layer -- this doc is what
makes that layer well-scoped instead of guessed at.
