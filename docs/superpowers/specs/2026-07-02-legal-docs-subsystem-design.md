# Legal Docs Subsystem — Design Spec

**Date:** 2026-07-02
**Status:** Approved, pending implementation plan

## Goal

Give Lion Jobs Agency two legally-protective documents, generated from live data instead of hand-edited in Word:

1. **B2B Service Contract** — a printable, bilingual (Burmese + English) agreement for corporate clients, stating the commission rate, the free-replacement guarantee window, and replacement cost, signed physically.
2. **Candidate Anti-Bypass Agreement** — a digital consent gate candidates must accept before seeing interview details, establishing a non-circumvention restriction and liquidated-damages penalty if they go around the agency.

This is the first of four planned dashboard subsystems (Legal Docs → B2B Billing & Invoicing → HRMS were the others raised; each gets its own spec/plan/implementation cycle, done sequentially). This spec covers Legal Docs only.

## Out of scope (this spec)

- **B2B Billing & Invoicing.** A separate subsystem/spec. This spec does not generate invoices or track payments — only the service contract that establishes the commission terms invoices will later reference.
- **HRMS (internal staff/payroll/attendance).** Fully separate domain, no dependency on this spec.
- **E-signatures for the B2B contract.** Company-side signing stays physical (print → sign → file). No e-sign vendor integration.
- **Hiding the company name earlier in the candidate journey.** `/my-applications` already shows company name at every stage, ungated, today. This spec does not change that — it only gates the *new* interview-details fields (location, interviewer contact) behind consent. Company name visibility is unchanged.
- **Enforcing the 12-month non-circumvention or 24-hour notify duty in code.** These are legal clauses recorded via consent, not systems the app can detect or block — there's no way for software to know if a candidate privately contacted a company. Enforcement is off-platform (legal action), not engineering.
- **Candidate portal authentication changes.** `/api/apply/status` keeps its existing email/phone lookup pattern; no new login system is introduced for candidates.

## Context: what already exists

- `companies` table (`src/lib/db/companies.ts`) has no commission-rate or guarantee-term fields.
- `contracts` table (`src/lib/db/contracts.ts`) is a CRM deal-value tracker (value, contract_type, status, dates) from the Enterprise CRM spec — it has no field for legal terms/text and is not reused here; this spec's contract is a legal document, not a CRM pipeline record.
- `candidates` table has `interviewDate` already but no interview location/interviewer contact field.
- `/my-applications` (`MyApplicationsClient.tsx`) looks up applications by email/phone via `/api/apply/status` and shows company name + stage at every stage, ungated.
- Dashboard (`DashboardClient.tsx`) has 9 tabs: overview, candidates, post-job, manage-jobs, companies, enterprise, b2b-leads, content, campaigns. This spec adds a 10th: **Legal**.
- Existing PDF-export pattern in `ResumeBuilder.tsx`: dynamic `import('html2canvas')` + `import('jspdf')`, render a DOM node to canvas, then to an A4 PDF. Reused here for an optional "Download PDF" action; the primary print path is browser-native `window.print()` on a dedicated print route.
- `src/lib/i18n.ts` / `LanguageContext` drives the site-wide Burmese/English UI toggle. The legal documents in this spec are **not** wired to that toggle — they render both languages together on the page, since the contract must be readable in both languages at once regardless of the viewer's UI language preference.

## Data model

### New table `agency_settings`

Single-row config table. Editable from the Legal tab so business terms change via a data edit, not a code deploy.

| column | type | notes |
|---|---|---|
| id | fixed singleton row (e.g. `id = 1`) | only one row ever exists |
| default_commission_rate_pct | numeric | default `60` |
| default_guarantee_days | integer | default `60` |
| default_replacement_cost_mmk | integer | default `0` |
| anti_bypass_penalty_mmk | integer | default `500000` |
| anti_bypass_restriction_months | integer | default `12` |
| terms_version | text | e.g. `'v1'`; bump when legal wording changes |
| updated_at | timestamp | |

### Alter `companies`

- Add `commission_rate_pct` (numeric, nullable). When null, contract generation falls back to `agency_settings.default_commission_rate_pct`. Never renders a blank/null rate on the printed document.

### Alter `candidates`

- Add `interview_location` (text, nullable).
- Add `interviewer_contact` (text, nullable).
- Both filled in via the Candidate Drawer once `stage === 'Interview'`.

### New table `candidate_consents`

| column | type | notes |
|---|---|---|
| id | uuid/serial PK | |
| candidate_id | FK → candidates.id | one row per application, not per person — matches `candidates` being one row per application |
| consent_type | text | `'anti_bypass'` (only value for now, kept as a column for future consent types) |
| terms_version | text | snapshot of `agency_settings.terms_version` at agreement time |
| agreed_at | timestamp | |
| ip_address | text, nullable | best-effort, read from request |
| user_agent | text, nullable | best-effort, read from request |

Gating check: does a `candidate_consents` row exist for `(candidate_id, terms_version = current agency_settings.terms_version)`? If yes, reveal interview details; if no, show the consent modal. Editing `interview_location`/`interviewer_contact` text does not invalidate an existing consent — only bumping `terms_version` requires the candidate to re-consent, and only prospectively (past consents remain valid audit records for the version they were given under).

## API routes

Admin-gated via the existing `requireAdmin()` pattern, except the candidate-facing consent route which is public (candidate is not an authenticated admin).

- **`/api/legal/settings`** — GET/PATCH `agency_settings` (admin only).
- **`/api/companies/{id}`** — extend existing PATCH to accept `commission_rate_pct`.
- **`/api/candidates/{id}`** — extend existing PATCH to accept `interview_location`, `interviewer_contact`.
- **`/api/candidates/{id}/consent`** — POST only, public (candidate-facing). Body: none required beyond the path id. Reads IP/user-agent server-side from the request, inserts a `candidate_consents` row, returns the now-unlocked interview fields. Rejects (400) if `interview_location` is not yet set on the candidate (nothing to consent to reveal).
- **`/api/apply/status`** — extend existing response to include `interviewLocation`/`interviewerContact` **only when** a matching consent row already exists for the current `terms_version`; otherwise include a `needsConsent: true` flag so the client knows to show the "View Interview Details" button instead of the raw fields.

## Dashboard UI — new "Legal" tab

Added to `DashboardClient.tsx`'s tab list (10th tab), new `LegalView.tsx` component.

**Agency Settings panel** (top of tab): edit `default_commission_rate_pct`, `default_guarantee_days`, `anti_bypass_penalty_mmk`, `anti_bypass_restriction_months`; a "Bump terms version" action that increments `terms_version` (with a confirmation, since it requires future candidates to re-consent).

**B2B Service Contracts section**: table of companies (name, tier, current effective commission rate — override or default, shown with a badge indicating which), inline editable `commission_rate_pct` override per row, "Print Contract" button (opens `/dashboard/legal/contract/[companyId]/print` in a new tab, auto-fires `window.print()`), "Download PDF" button (reuses the `html2canvas`+`jsPDF` pattern).

**Candidate Consents section**: filterable list of candidates at `Interview`+ stage — name, position, company, consent status (Agreed `{date}` under `{version}` / Pending), so CSEs can check before calling a candidate.

## Print route

`/dashboard/legal/contract/[companyId]/print` — a minimal Next.js page with no dashboard chrome (no sidebar/header), `@media print` CSS for A4 layout. Content: bilingual Burmese + English clauses (commission rate, 60-day free-replacement guarantee, 0 MMK replacement cost, effective date = today, signature blocks for both parties left blank for physical signing). This route is intentionally separate from the Legal tab's own layout so print CSS doesn't have to fight dashboard chrome.

## Candidate-facing consent flow

1. CSE sets `interview_location`/`interviewer_contact` on the Candidate Drawer when moving a candidate to `Interview` stage.
2. Candidate checks status at `/my-applications`. If `stage === 'Interview'` and `needsConsent: true`, a "View Interview Details" button replaces the raw fields.
3. Clicking opens a modal with the full bilingual anti-bypass terms (12-month non-circumvention, 24-hour duty to notify, permanent ban, 500,000 MMK liquidated damages) and a required "I Agree" checkbox gating the submit button.
4. Submit → `POST /api/candidates/{id}/consent` → modal closes, interview location/date/interviewer contact render inline. Future visits show the details directly (no re-prompt) since the consent row now exists for the current `terms_version`.

Candidate Drawer (admin side) shows a read-only "Anti-Bypass Consent" badge (Agreed `{date}` / Not yet agreed) next to the interview fields.

## Edge cases

- Company has no `commission_rate_pct` override → contract prints `agency_settings.default_commission_rate_pct`. Never prints blank.
- Candidate reaches `Interview` stage but CSE hasn't filled `interview_location` yet → `/my-applications` shows the stage badge as today, no consent prompt yet (nothing to gate).
- `terms_version` is bumped after a candidate already consented under an older version → that candidate's old consent stays valid (their interview already happened or is already in motion); the gate only re-triggers if they reach a *new* Interview-stage application after the bump, since consent is keyed per `candidates.id` (per-application), not per-person.

## Verification

No test suite exists in this project (per `CLAUDE.md`). Verification: `npx tsc --noEmit`, `npm run lint`, then manual dashboard walkthrough — print/download a sample company's contract, edit a company's commission override and confirm it reflects on the printed doc, and run a sample candidate through Interview stage → consent modal → details reveal on `/my-applications`.
