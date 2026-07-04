# Layer 3: Company Portal Document Center + Invoice Notification — Design Spec

Part of the Company Dashboard roadmap, Layer 3 of 10. Builds on Layer 1's
`company_id` FK.

## Scope, deliberately narrowed

The roadmap item was "Document/Contract Center + Notifications." Full
notification coverage (new applicant, every stage change) touches
multiple mutation routes across the candidate pipeline — a wider,
riskier surface, same category of problem Phase 14's audit log spec
flagged as "too large to safely execute unsupervised in one pass." Scoped
down tonight to what's genuinely low-risk and self-contained:

- **Contracts, read-only.** `getContracts(companyId)` already existed,
  already correctly scoped. Added to `/api/company-portal/me` and
  rendered as a new section in `CompanyPortalClientImpl.tsx` — same
  read-only pattern as the existing Jobs/Invoices sections.
- **One notification: invoice issued.** Single mutation site
  (`POST /api/invoices`), best-effort (wrapped in try/catch, logs via
  `logFailure` on send failure, never fails the invoice creation itself
  — same posture as every optional integration in this repo).

**Deferred, not built tonight:** new-applicant and stage-change
notifications. These touch the candidate stage-update route(s) across
the Kanban/table flows — real work, but wider blast radius than is safe
to land unsupervised. Flagging as a follow-up layer, not silently
dropped.

## Changes

- `src/lib/portalEmail.ts`: new `sendInvoiceIssuedEmail()`, same
  graceful-no-op-if-unconfigured pattern as `sendPortalLoginEmail()`.
- `src/app/api/invoices/route.ts`: POST now sends the notification to
  `company.email` after a successful `createInvoice()`, non-blocking.
- `src/app/api/company-portal/me/route.ts`: adds `contracts` to the
  response, scoped by the same `companyId` as invoices.
- `src/components/portal/CompanyPortalClientImpl.tsx`: new "Contracts"
  section, same visual pattern as Jobs/Invoices.

## Verified

- `npx tsc --noEmit` clean.
- `npm run lint` — same 28 pre-existing baseline problems, none in the
  four touched files.
- Not live-tested against a real Resend send (no `RESEND_API_KEY` in
  this session's shell) — the no-op path (`console.warn`, return) was
  exercised implicitly by every other portal-auth email call in this
  environment behaving the same way. Real production behavior should be
  confirmed once deployed, same as any Resend-dependent change.
