# Layer 9: Company Portal Team Seats — Design Spec

Part of the Company Dashboard roadmap, Layer 9 of 10. Spec only.

## Problem

The Company Portal has exactly one login per company: `getCompanyByEmail`
matches the single `companies.email` column. A larger enterprise client
with an HR manager *and* a hiring manager who both want visibility has
no way to both have accounts — they'd have to share one login and one
magic-link inbox.

## Proposed design

- New `company_portal_users` table: `(id, company_id FK, email, name,
  role: 'primary' | 'member', invited_by, created_at)`. The existing
  `companies.email`/`contactPerson` becomes the seeded `primary` row on
  migration — no behavior change for any company that never adds a
  second user.
- `portalAuth.ts`'s `getCompanyByEmail`-based login lookup extends to
  check `company_portal_users` first, falling back to the legacy direct
  `companies.email` match — same additive, non-regressing pattern as
  Layer 1's jobs FK fallback.
- **Inviting a teammate**: `primary` role only, from a new small panel in
  the portal ("Team" section) — enter an email, magic-link invite sent
  via the existing `portalEmail.ts` infra.
- All roles see identical data (no per-seat data restriction) — this is
  about *who can log in*, not a second RBAC system layered on top of the
  Portal. Keep it that simple unless a real need for seat-level
  restriction emerges.

## Non-goals

- Per-seat permissions within the portal (out of scope — see above).
- Removing/deactivating seats (a `primary` can stop inviting, but
  revocation flow is a small follow-up, not required for v1).
