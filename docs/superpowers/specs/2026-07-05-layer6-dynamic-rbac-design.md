# Layer 6: Dynamic RBAC (DB-driven + Admin UI) — Design Spec

Part of the Company Dashboard roadmap, Layer 6 of 10. **Spec only — this
is a security-critical reversal of a deliberate prior decision and should
not land without the repo owner reviewing the migration path.**

## What's being reversed

`src/lib/permissions.ts`'s own comment: "Changing a role's access is a
code change + deploy, not a runtime setting — deliberate." That
deliberateness bought two things: every permission change is
code-reviewed and git-blamed, and there's no way to misconfigure access
at runtime. Moving to DB-driven permissions gives up both, in exchange
for the ability to add a 5th role or retune a tab's access level without
a deploy.

## Proposed design

- New `role_permissions` table: `(role, tab_domain, access_level)`,
  seeded on migration from the current `PERMISSIONS` constant exactly
  (so day one behavior is bit-for-bit identical to today).
- `getAccessLevel()`/`hasAccess()` in `permissions.ts` become async,
  reading from this table with the existing hard-coded `PERMISSIONS`
  object kept in the same file as a **compile-time fallback** if the DB
  read fails (fail-closed to today's known-good matrix, not fail-open to
  "allow everything").
- New Admin UI: a grid (role × tab) on the **Team & Access** tab, `owner`
  only (not `admin` — changing who can change permissions should be the
  narrowest possible circle), editing cells directly against
  `role_permissions`.
- Every write to `role_permissions` needs Layer 7's audit log wired in
  from day one — "who changed a permission and when" is the whole reason
  this table is more dangerous than any other config table in the app.

## Rollout discipline

Same posture Phase 4's original RBAC rollout used (per its own spec):
this touches the enforcement path for every `manage`-level mutation in
the app. Proposed rollout:
1. Add the table + seed, but keep `permissions.ts` reading the hard-coded
   constant (no behavior change yet) — verify the seed matches exactly.
2. Switch reads to the DB table with the constant as fallback, still no
   UI to change it — a silent no-op migration, verifiable by diffing
   effective permissions before/after.
3. Only then add the Admin UI, gated `owner`-only, with the audit log
   already in place.

Each step is independently verifiable and revertible. Do not collapse
these into one PR.

## Non-goals

- Per-user permission overrides (role-level only, matching today).
- Any change to `requireTabAccess`'s call sites — the enforcement
  contract stays the same, only where the answer comes from changes.
