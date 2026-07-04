# Layer 4: Job Posting Self-Service + Request Center — Design Spec

Part of the Company Dashboard roadmap, Layer 4 of 10. **Spec only tonight
— not implemented.** This changes the recruitment intake workflow itself;
the repo owner should see the design before it lands, same discipline
Phase 15 (leads assignment) and Phase 17 (AI scoring) applied to
decisions with real business-process weight, not just code risk.

## Context

Jobs have no status/approval concept today — `appendJob()` writes
directly to the live, publicly-listed `jobs` table. Company Portal users
currently have zero write access to anything; the portal is 100%
read-only.

## Proposed design

**New `job_requests` table**, deliberately separate from `jobs`, not a
new status column on it — keeps the public job listing query
(`getJobs()`/`getJobsPaginated()`, 11+ call sites) completely untouched:

```
id, company_id (FK), title, location, category, type,
salary_min, salary_max, currency, description, requirements[],
status ('Pending' | 'Approved' | 'Rejected'), submitted_at,
reviewed_by (staff email, nullable), reviewed_at (nullable),
rejection_note (nullable)
```

- **Portal side**: new `POST /api/company-portal/job-requests` (auth via
  existing `getPortalSubjectId('company')`), a simple form in
  `CompanyPortalClientImpl.tsx`. A submitted request shows in the
  portal's own list with its status, not the public site.
- **Staff side**: new small panel on the existing **Manage Jobs** tab
  (not a new dashboard tab) listing pending requests. "Approve" calls
  `appendJob()` with the request's fields (+ `companyId`, so it's
  correctly FK'd from birth — no backfill dependency) and marks the
  request `Approved`. "Reject" requires a note, no `jobs` row created.
- **Notification**: reuse `portalEmail.ts`'s pattern — email the company
  contact when their request is approved/rejected (approved should link
  straight to the live listing).
- **Request Center** (the other half of this roadmap item): a lighter
  lift once `job_requests` exists — a free-text `company_messages` table
  (company_id, message, created_at, resolved) surfaced as a simple
  contact form + staff inbox, reusing the same "new table, own inbox
  panel on an existing tab" shape as job requests, not a new dashboard
  tab either.

## Why this needs sign-off, not just building

- **Real workflow change**: today, job intake happens entirely off-platform
  (WhatsApp/email/call to a CSE, who uses the Post Job form). This
  creates a second, parallel intake channel. Worth asking: should
  approved requests *require* staff review before going live, or would
  some tiers (e.g. `enterprise`) get auto-publish? That's a business
  call, not an engineering one.
- **RBAC touch**: approving a request needs `manage-jobs` write access —
  fine under current RBAC, but confirms the request center should live
  under existing tab permissions, not a new permission cell.

## Non-goals

- Editing/deleting already-published jobs from the portal (out of scope
  — this is intake only).
- Auto-publish without staff review (not decided here).
