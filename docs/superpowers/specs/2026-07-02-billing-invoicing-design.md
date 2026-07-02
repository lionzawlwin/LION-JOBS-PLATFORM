# B2B Billing & Invoicing System — Design Spec

**Date:** 2026-07-02
**Status:** Approved, pending implementation plan

## Goal

Let Lion Jobs Agency generate a snapshotted, printable invoice for a single placement — pulling the placed candidate's name/position, the actual agreed salary, and the commission fee (computed from the company's negotiated rate or the agency default) — from the Candidate Drawer at the moment a candidate is marked Hired, with a dedicated Billing tab to track invoice status afterward.

This is the second of three planned dashboard subsystems following the strategic sequencing agreed with the CEO (Legal Docs → **Billing & Invoicing** → HRMS/Payroll), chosen because it directly reuses the commission-rate data model the Legal Docs subsystem just shipped and is revenue-facing, unlike the higher-complexity, compliance-heavy HRMS/Payroll work that follows it.

## Out of scope (this spec)

- **Email delivery.** Invoices are print/download only in this version, matching the B2B Service Contract's print route. Sending via the existing Resend pipeline is an explicit fast-follow, not part of this spec.
- **Partial payments / payment ledger.** Status is a single enum (`Draft | Sent | Paid | Overdue`), flipped manually by an admin. No payment-amount tracking, no audit trail of individual payments.
- **Batched/multi-placement invoices.** One invoice covers exactly one placement (one candidate, one company, one commission line). An admin who places multiple candidates at the same company generates multiple separate invoices.
- **HRMS/Payroll.** A fully separate subsystem and spec, sequenced after this one. No dependency in either direction.
- **Automatic invoice generation.** Invoices are only ever created by an explicit admin action ("Generate Invoice" in the Candidate Drawer at Hired stage) — never triggered automatically by a stage change alone, since the final agreed salary must be captured first.

## Context: what already exists

- `Candidate`/`applications` has `stage: 'Applied' | 'Shortlisted' | 'Interview' | 'Hired'` but no field for the actual agreed salary — only `salaryExpected`, the candidate's pre-hire ask, not necessarily what they were placed at. This spec adds `final_agreed_salary` to fill that gap.
- The Legal Docs subsystem (`docs/superpowers/specs/2026-07-02-legal-docs-subsystem-design.md`) already established: `agency_settings.default_commission_rate_pct`, per-company `companies.commission_rate_pct` override (nullable, 0–100 bounded, resolved as `company.commissionRatePct ?? settings.defaultCommissionRatePct`), the Candidate Drawer's stage-gated inline-edit pattern (interview details at Interview stage — this spec adds an analogous section at Hired stage), and the print-route pattern (`ContractDocument.tsx` + `AutoPrint.tsx` + an admin-gated server component page under `src/app/dashboard/**/print/`).
- Dashboard has 10 tabs as of the Legal Docs subsystem (`overview | candidates | post-job | manage-jobs | companies | enterprise | b2b-leads | content | campaigns | legal`). This spec adds an 11th: **Billing**.
- No prior concept of invoices, placements, or billing anywhere in the codebase.

## Data model

### Alter `applications`

- Add `final_agreed_salary` (numeric, nullable). Set via the Candidate Drawer once `stage === 'Hired'`; never auto-populated from `salaryExpected`.

### New table `invoices`

One-to-one with a placement (`application_id` is unique — enforced at the application layer via a "does an invoice already exist for this application" check before allowing generation, not a DB constraint, matching the existing codebase's convention of app-layer rather than DB-layer business-rule enforcement seen throughout Legal Docs).

| column | type | notes |
|---|---|---|
| id | TEXT PK | app-generated, e.g. `inv-${Date.now()}-...` |
| invoice_number | TEXT | sequential human-readable, format `INV-{5-digit zero-padded count}`, e.g. `INV-00001`, `INV-00002` — a single global counter that never resets (not per-year), computed as `COUNT(*) + 1` against the `invoices` table within the same insert request |
| company_id | FK → companies.id | |
| application_id | FK → applications.id, nullable, ON DELETE SET NULL | nullable for the same reason as `candidate_consents.application_id` — an invoice is a financial record that must outlive the candidate/application it originated from |
| candidate_name | TEXT | snapshotted at generation time, not joined live |
| position | TEXT | snapshotted |
| agreed_salary | NUMERIC | snapshotted from `final_agreed_salary` at generation time |
| commission_rate_pct | NUMERIC | snapshotted resolved rate (override or default) at generation time |
| commission_fee_mmk | NUMERIC | computed once at generation: `agreed_salary * commission_rate_pct / 100` |
| status | TEXT | `'Draft' \| 'Sent' \| 'Paid' \| 'Overdue'`, default `'Draft'` |
| issued_at | DATE | set at generation time |
| created_at | TIMESTAMPTZ | |

**Snapshotting is the core design principle of this table**: every value that could otherwise be derived live (candidate name, position, salary, commission rate, fee) is captured once at generation and never recomputed — an invoice must not silently change if `agency_settings` or the candidate record changes later. This mirrors `candidate_consents.terms_version` from the Legal Docs subsystem.

## API routes

Admin-gated via the existing `requireAdmin()`-equivalent pattern, except invoice numbering must be server-computed (never client-supplied) to guarantee sequential, non-colliding numbers.

- **`/api/candidates/{id}/final-salary`** — PATCH, admin. Sets `final_agreed_salary` on the application. Mirrors `/api/candidates/{id}/interview`'s shape exactly.
- **`/api/invoices`** — GET (list, admin, optional `?companyId=`/`?status=` filters), POST (admin, generates a new invoice: takes `applicationId`, looks up the application's `final_agreed_salary` and company, resolves the commission rate, computes the fee, generates the next sequential `invoice_number`, inserts the row). Rejects (409) if an invoice already exists for that `applicationId`.
- **`/api/invoices/{id}`** — PATCH (admin, status updates only — `status` is the only mutable field post-creation, since every other field is a snapshot).
- **`/api/invoices/{id}`** — GET (admin, used by the print route to fetch the snapshotted invoice data — no join back to live `companies`/`applications` data beyond `company.name`/address for the letterhead, since the financial figures are already snapshotted on the row).

## Dashboard UI

### Candidate Drawer — Billing section (new, gated to `stage === 'Hired'`)

Same structural pattern as the Interview Details section at Interview stage: an editable `final_agreed_salary` field (inline edit mode, save button), and below it either:
- No invoice yet + salary set → "Generate Invoice" button
- No invoice yet + salary not set → disabled state with a hint to set salary first
- Invoice exists → "View Invoice" link to the print route

### New "Billing" tab (`BillingView.tsx`, mirrors `LegalView.tsx`'s table pattern)

Table: Invoice # · Company · Candidate/Position · Fee (MMK) · Status (badge, color-coded) · Issued date · actions (Print link, status dropdown). Filters: company, status. No invoice-creation form here — creation only happens from the Candidate Drawer, keeping one unambiguous entry point.

## Print route

`src/app/dashboard/billing/invoice/[invoiceId]/print/page.tsx` — admin-gated server component, no site chrome (same convention as the contract print route — this project has no shared dashboard layout, so simply not importing `Navbar`/`Footer` is sufficient). Renders `InvoiceDocument.tsx`: company name/address, invoice number, issued date, candidate name/position, agreed salary, commission rate, commission fee — **English only** (an invoice is a commercial/accounting document exchanged with a business counterpart, not a candidate-facing legal document, so the bilingual-always rule from `ContractDocument.tsx` does not apply here). Reuses `AutoPrint.tsx` unchanged.

## Edge cases

- `final_agreed_salary` unset → "Generate Invoice" stays disabled with an explanatory hint; the POST route also rejects (400) if called without it set, as defense in depth against a stale UI state.
- Invoice already exists for an `applicationId` → POST `/api/invoices` returns 409; UI never shows "Generate Invoice" a second time once an invoice id is known for that application (drawer checks invoice existence via GET `/api/invoices?applicationId=`).
- `agency_settings.default_commission_rate_pct` or a company's `commission_rate_pct` override changes after an invoice exists → already-generated invoices are unaffected; only invoices generated after the change use the new rate.
- Invoice numbering must never collide even under concurrent generation — computed server-side (`COUNT(*) + 1` against `invoices`) within the same request that inserts the row, not client-supplied and not a separate "peek then insert" round trip. This is a single-admin-gated internal tool (one `ADMIN_EMAIL` throughout this codebase), so true concurrent-request collision risk is negligible in practice — not worth a DB sequence/lock beyond this.

## Verification

No test suite exists in this project (per `CLAUDE.md`). Verification: `npx tsc --noEmit`, `npm run lint`, then manual dashboard walkthrough — set a final agreed salary on a Hired candidate, generate an invoice, confirm the fee math (`agreed_salary * rate / 100`), confirm it prints correctly, then change the company's commission override and confirm the already-generated invoice's displayed fee is unchanged.
