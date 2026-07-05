# Layer 6: Dynamic RBAC — Design Spec

Supersedes `docs/superpowers/specs/2026-07-05-layer6-dynamic-rbac-design.md`
(that earlier document was a proposal sketch written during the overnight
roadmap session; this one is the reviewed, approved design, brainstormed
directly with the repo owner on 2026-07-06). Part of the Company Dashboard
roadmap, Layer 6 of 10.

**Note on review process**: this design was brainstormed interactively —
the repo owner approved Sections 1–3 explicitly, then gave blanket
approval to complete and implement the rest autonomously ("do all this
yourself, i give you all permission and approved. i want to sleep.").
Section 4 (rollout/testing) reflects decisions already made via explicit
multiple-choice answers earlier in the same conversation, not a
unilateral addition. Given this is flagged by the repo owner's own prior
roadmap note as "the one most worth reading closely before approving,"
implementation proceeds with the full 3-step rollout below, each step
independently verified and PR'd, rather than collapsed into one change.

## Decisions made (via interactive brainstorming)

1. **Scope**: editable matrix only for the existing 4 roles
   (owner/admin/cse/viewer). No support for adding new roles at runtime —
   `StaffRole`, the `staff` table's SQL CHECK constraint, NextAuth session
   typing, and the Team & Access role picker all stay exactly as they are.
2. **Audit**: a small, scoped audit trail for `role_permissions` writes
   only — not blocked on or part of the general Phase 14 audit log.
3. **Client data flow**: the visible-tab list is computed server-side
   (`dashboard/page.tsx`) and passed to `DashboardClient.tsx` as a prop —
   no client-side DB/permission calls.
4. **Rollout**: the full 3-step staged rollout, each step its own
   independently-reviewable PR.
5. **Lockout guardrail**: hard-blocked, server-side, not just in the UI —
   owner/admin can never have their `team`/`system-health` access set
   below `manage` through this system.

## Schema

```sql
CREATE TABLE role_permissions (
  role         TEXT NOT NULL CHECK (role IN ('owner','admin','cse','viewer')),
  tab_domain   TEXT NOT NULL CHECK (tab_domain IN ('overview','candidates','post-job',
                 'manage-jobs','companies','enterprise','b2b-leads','content','campaigns',
                 'legal','billing','team','system-health')),
  access_level TEXT NOT NULL CHECK (access_level IN ('none','view','manage')),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by   TEXT,
  PRIMARY KEY (role, tab_domain)
);

CREATE TABLE permission_changes (
  id               TEXT PRIMARY KEY,
  role             TEXT NOT NULL,
  tab_domain       TEXT NOT NULL,
  old_access_level TEXT NOT NULL,
  new_access_level TEXT NOT NULL,
  changed_by       TEXT NOT NULL,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

`role_permissions` is seeded, in the same migration, with the exact 52
rows (4 roles × 13 domains) `PERMISSIONS` in `permissions.ts` encodes
today. `permission_changes` is append-only.

## Read path

`permissions.ts`'s `PERMISSIONS` constant is kept, unchanged, as a
compile-time fallback. `getAccessLevel`/`hasAccess` become async:

```ts
async function getEffectiveMatrix(): Promise<typeof PERMISSIONS> {
  try {
    return await getCachedRolePermissions();
  } catch {
    return PERMISSIONS; // fail closed to the known-good hardcoded matrix
  }
}

export async function getAccessLevel(role: StaffRole, domain: TabDomain): Promise<AccessLevel> {
  return (await getEffectiveMatrix())[role][domain];
}

export async function hasAccess(role: StaffRole, domain: TabDomain, required: 'view' | 'manage'): Promise<boolean> {
  return LEVEL_RANK[await getAccessLevel(role, domain)] >= LEVEL_RANK[required];
}
```

`getCachedRolePermissions()` (new, in `src/lib/db/rolePermissions.ts`)
wraps the Supabase read in `unstable_cache` (tag `'role-permissions'`),
matching `enterpriseStats.ts`'s established Phase 21 pattern exactly —
same reasoning (Vercel Data Cache over the newer, costlier `"use cache"`
API) applies unchanged. Every write to `role_permissions` calls
`revalidateTag('role-permissions', { expire: 0 })` immediately after.

`auth.ts`'s `requireTabAccess` changes by one line
(`hasAccess(...)` → `await hasAccess(...)`); its 37 existing call sites
are unaffected since they already `await requireTabAccess(...)`.

## Client data flow

`dashboard/page.tsx` computes the filtered tab list server-side (calling
the new async `getAccessLevel` across all 13 domains for the signed-in
role) and passes it to `DashboardClient.tsx` as a `visibleTabs` prop.
`DashboardClient.tsx` removes its `getAccessLevel` import and the
`ALL_TABS.filter(...)` call, reading `visibleTabs` directly instead.

## Write path

New `PATCH /api/role-permissions`, gated `requireRole(['owner'])` (not
`requireTabAccess` — narrower than any existing tab permission, matching
"owner only, not admin" for changing who can change permissions). Body:
`{ role, tabDomain, accessLevel }`.

1. `requireRole(['owner'])` — reject non-owners first.
2. **Guardrail**: if `role ∈ {owner, admin}` and
   `tabDomain ∈ {team, system-health}` and `accessLevel !== 'manage'` →
   422, `"This would remove all admin access to permissions management. Owner and Admin must always retain 'manage' access to Team & Access."`
   Enforced in the route handler, not just the UI — unbypassable via a
   direct API call.
3. Read the current cell (for the audit row; no-ops harmlessly if
   unchanged).
4. Upsert into `role_permissions` (`updated_at`, `updated_by` = caller's
   session email).
5. Insert one row into `permission_changes`.
6. `revalidateTag('role-permissions', { expire: 0 })`.

Steps 4–5 run inside one transaction (a single Postgres function via
`execute_sql`/RPC, not two separate round-trips), so a failure between
the upsert and the audit insert can't happen.

## Admin UI

New `PermissionsGrid` component added to the existing **Team & Access**
tab (`TeamView.tsx`) — no new dashboard tab. 13×4 grid (domains × roles),
each cell a `<select>` (None/View/Manage). Read-only for `admin`,
editable for `owner` (client-side hint for UX; the real boundary is
`requireRole(['owner'])` in the write endpoint). A "Recent Permission
Changes" panel below the grid lists the last 20 `permission_changes` rows
(who, which cell, old → new, when).

## Rollout (3 independently-reviewed PRs)

1. **PR 1 — table + seed, no behavior change.** Migration creates both
   tables and seeds `role_permissions` from the current `PERMISSIONS`
   constant. `permissions.ts` is untouched — still reads the hardcoded
   matrix. Verify: seed row count (52) and values match `PERMISSIONS`
   exactly, via a direct query.
2. **PR 2 — switch reads, with fallback.** `permissions.ts` becomes
   async as above; `auth.ts` and `DashboardClient.tsx`'s data flow change
   land together (they're the same behavioral seam). No UI to edit yet.
   Verify: effective permissions for every (role, domain) pair are
   identical before/after this PR (a small script/test comparing the old
   synchronous `PERMISSIONS[role][domain]` against the new async
   `getAccessLevel(role, domain)` for all 52 pairs).
3. **PR 3 — Admin UI + write endpoint + audit trail + guardrail.** The
   only PR that actually lets a permission be changed. Verify: guardrail
   rejects the owner/admin lockout case; a normal edit updates the cell,
   appears in the audit panel, and takes effect on the next request
   (cache invalidation confirmed).

Each PR is independently revertible; PR 3 depends on PR 2 depends on
PR 1.

## Testing

- `permissions.test.ts` is updated for `getAccessLevel`/`hasAccess`
  being async (`await` added to all existing assertions) — same test
  cases, same expected values, now exercised against the DB-backed path
  once PR 2 lands (with Supabase reachable in the test env) or against
  the fallback matrix (if not) — either way the assertions are identical
  since PR 1 guarantees they match.
- New tests for the write endpoint: guardrail rejection, successful
  write + audit row creation, cache invalidation.

## Non-goals

- Per-user permission overrides (role-level only, matching today).
- Any change to `requireTabAccess`'s call-site contract.
- Supporting new roles at runtime (explicitly descoped — see Decision 1).
