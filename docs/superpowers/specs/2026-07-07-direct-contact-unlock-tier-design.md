# Direct-Contact-Info Upsell Tier — technical design spec

Requested as the priority revenue-driver build for the next session. This
is a **design spec only** — no code written against it yet. Item #7 of
`docs/superpowers/specs/2026-07-07-cto-big-upgrades-portfolio.md`, which
flagged this as needing a real business-model decision before building.
This doc makes that decision concrete (with a recommended default for
every open question) rather than stopping at "it depends" — build should
start the moment the four items in "Open decisions" below are confirmed.

## Goal

A paid add-on: for a fee, an employer unlocks one specific applicant's
direct phone/email so they can contact that candidate without going
through the agency, on a per-candidate-per-job basis.

## Non-goals

- Not a subscription-wide feature of the `account_plans` tiers (Bronze/
  Silver/Gold) — scoped per-unlock, matching the existing Featured
  Placement / Job Boost transactional-upsell pattern, not the plan-tier
  pattern.
- Not a replacement for the agency's placement commission. Unlock revenue
  and placement-commission revenue are two separate invoice lines that
  both apply on a successful hire — see "Business model" below, this is
  the single most important design decision in this doc.
- Not blanket, application-time consent (unlike the existing anti-bypass
  modal candidates already see when applying). This is a narrower,
  separate opt-in — see "Consent" below.

## Business model (recommended, needs your confirmation)

This repo already has a legal mechanism built for exactly this tension:
`agency_settings.anti_bypass_penalty_mmk` / `anti_bypass_restriction_months`
(defaults 500,000 MMK / 12 months) is a financial penalty a candidate
already legally consents to (`candidate_consents`, `consent_type:
'anti_bypass'`, via `AntiBypassConsentModal.tsx` at application time) if
they or an employer circumvent the agency's placement fee by going
direct. **The unlock tier is the agency selling a specific, paid
exception to that same clause** — not disintermediating itself. Concretely:

1. Employer pays the unlock fee → sees phone + email for **one**
   application, not the candidate's other applications with the agency.
2. The existing placement-commission invoice (`candidate_placement`
   charge type) still applies in full if that candidate is hired —
   completely unchanged by the unlock. State this explicitly in the
   unlock UI copy so no employer mistakes the unlock fee for the
   placement fee.
3. The anti-bypass penalty continues to apply to any contact that
   happens **without** a paid, consented unlock on file — this feature
   doesn't weaken that protection, it's the one path around it that's
   actually authorized and monetized.

## Consent (recommended, needs your confirmation on wording/placement)

Direct-contact sharing needs its own opt-in from the candidate, separate
from the anti-bypass consent (which is about *penalties for unauthorized*
contact, not permission for *authorized* contact) and separate from
`consent_to_feature` (which governs public testimonials, a different
disclosure). Recommendation:

- New `candidate_consents.consent_type: 'direct_contact_unlock'` row,
  captured either as an application-form checkbox or a toggle on
  `/my-applications` — **default OFF**, opt-in only, same posture as
  `consent_to_feature`.
- An employer can only pay to unlock a candidate who has this consent on
  file. If absent, the Company Portal shows "this candidate hasn't
  enabled direct contact" — not a disabled paywall button — so no one is
  invoiced for something that can't unlock (mirrors this repo's existing
  discipline against silently-broken paid actions).

## Data model (prepared here, NOT applied without your explicit go-ahead)

```sql
-- supabase/migrations/NNNN_add_contact_unlocks.sql (file to write next
-- session, following supabase/MIGRATIONS.md's process -- write, verify
-- against live schema via list_tables, then wait for go-ahead to push)
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
```

- One row per (application, company) — prevents double-charging the same
  unlock, closing the same class of gap `invoices.application_id` was
  explicitly left open with (no UNIQUE constraint, logged as an accepted
  follow-up in the billing subsystem's own PROGRESS.md entry) — worth
  doing right from the start here since it's a net-new table.
- `invoices.charge_type` (the checked enum from migration `0033`) gains a
  5th value: `'contact_unlock'`, same additive pattern as
  `plan_upgrade`/`featured_placement`/`job_boost` before it.
- Candidate consent reuses the existing `candidate_consents` table with a
  new `consent_type` value — no new consent table needed.

## API surface (new routes, following the existing request -> approve -> invoice pattern)

- `POST /api/company-portal/contact-unlock-requests` — employer requests
  an unlock for one `applicationId`. 422 with a clear message if the
  candidate hasn't consented (checked server-side, not just hidden client-side).
- `GET`/`PATCH /api/contact-unlock-requests` — staff-side inbox (Billing
  tab), same approve-and-invoice shape as
  `featured-placement-requests`/`job-boost-request`, gated by
  `requireTabAccess('billing', 'manage')`.
- On invoice paid (`POST /api/invoices/[id]/payments`, the same
  best-effort-activation invariant PR #109 already tests): mark
  `contact_unlocks.status = 'paid'`, set `unlocked_at`.
- `GET /api/company-portal/me` gains `contactUnlocks: { applicationId,
  phone, email }[]`, populated only for applications with a
  paid-and-consented unlock for that company — reuses the
  `EmployerVisibleApplicant` column-whitelist-at-the-query-layer pattern
  from PR #101 rather than ever handing this route a full `Candidate` row.

## UI

- Candidate side: opt-in toggle (application form or `/my-applications`),
  plain-language explanation of what it means (mirrors the anti-bypass
  modal's own clarity).
- Company Portal: inside the existing expandable `ApplicantList`, an
  "Unlock direct contact — {price} MMK" button; shows phone+email inline
  once paid; shows a non-paywall "not enabled by this candidate" message
  when consent is absent.
- Staff dashboard: new "Contact Unlock Requests" inbox on Billing,
  mirroring `FeaturedPlacementSettingsPanel`'s owner-editable price panel.

## Testing plan (once built)

- Pure-function tests for eligibility (`isContactUnlockEligible(consent,
  unlockStatus)`), same style as this session's `portalAnalytics.test.ts`.
- Route-handler tests for request/approve/payment, same style as PR #109
  (auth rejection, consent-missing 422, duplicate-request via the unique index).

## Open decisions requiring your explicit go-ahead before this is built

1. **Price.** Recommendation: 15,000-30,000 MMK per unlock (between Job
   Boost's 20,000/14d and Featured Placement's 50,000/30d, reflecting
   that this unlocks one candidate, not a whole listing). Owner-editable
   via `agency_settings`, same as the other two.
2. **Consent UX placement.** Application-form checkbox, a
   `/my-applications` toggle, or both.
3. **Confirm the business model above** — unlock fee and placement
   commission both apply on a hire; this is not the agency stepping out
   of the deal.
4. **Retroactive unlock.** Can an employer unlock contact for an
   application already at Hired (e.g., for onboarding logistics)?
   Recommendation: yes.

Once these four are confirmed, this is directly buildable in one bounded
session, same as Layer 10's design-spec -> implementation-plan -> build
sequence.
