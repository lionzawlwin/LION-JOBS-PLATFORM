# Phase 4: Per-Tab/Per-Action RBAC — Design Spec

## Context

Phase 3a/3b introduced the `staff` table and attached a `StaffRole`
(`owner` | `admin` | `cse` | `viewer`) to every session, but enforcement is
still single-tier: `requireStaff()` only checks "is there a session" — any
active staff member, regardless of role, has the same dashboard access as
every other. The only exception is `/api/staff/*`, gated to `owner`/`admin`
via `requireRole()`.

Phase 4 closes that gap: each dashboard tab and its mutating actions become
gated by role, enforced server-side (API routes), with client-side tab
hiding as a UX layer on top — not the security boundary.

## Goals

- A `cse` or `viewer` staff member cannot view or mutate data outside what
  their role permits, even by calling the API directly (not just via a
  hidden UI tab).
- `owner`/`admin` behavior is unchanged (full access everywhere).
- Enforcement lives in one reviewable place, not scattered ad hoc checks.

## Non-goals (explicitly out of scope this phase)

- **Row-level data scoping** — e.g. a `cse` seeing only Enterprise accounts
  assigned to their own `CseRep` record. `CseRep` (CRM rep, used for
  contract/account assignment) and `Staff` (login/role record) are separate
  tables today with no link between them; wiring that up is a distinct,
  larger effort. This phase only controls *which tabs/actions* a role can
  reach, not *which rows* within an allowed tab.
- **DB-backed / admin-editable permission matrix.** The matrix is hard-coded
  in a single TypeScript file. Changing a role's access requires a code
  change and deploy, not a dashboard UI. No stated need yet for runtime
  reconfiguration.
- **Per-individual-action granularity.** Access is two-level per tab:
  `none` / `view` / `manage`. Not "can edit but not delete," etc.
- **Sentry/Observability (Phase 5)**, **alerting**, and **any change to
  Phase 3's role/permission *plumbing*** (the `staff` table, `authOptions.ts`
  signIn/jwt/session callbacks, `requireStaff()`/`requireRole()` themselves)
  — this phase *adds* a new check alongside them, it doesn't modify them.

## Access model

Twelve domains, one per dashboard tab: `overview`, `candidates`,
`post-job`, `manage-jobs`, `companies`, `enterprise`, `b2b-leads`,
`content`, `campaigns`, `legal`, `billing`, `team`.

Each `(role, domain)` pair resolves to one of: `none` (tab hidden, all
routes in that domain 401), `view` (tab visible, GET-type routes allowed,
mutating routes 401), `manage` (full access).

### Matrix

| Domain | owner | admin | cse | viewer |
|---|---|---|---|---|
| overview | manage | manage | view | view |
| candidates | manage | manage | none | view |
| post-job | manage | manage | none | none |
| manage-jobs | manage | manage | none | view |
| companies | manage | manage | manage | view |
| enterprise | manage | manage | manage | view |
| b2b-leads | manage | manage | manage | view |
| content | manage | manage | none | view |
| campaigns | manage | manage | none | view |
| legal | manage | manage | view | view |
| billing | manage | manage | view | view |
| team | manage | manage | none | none |

`overview` has no mutating routes, so `view` and `manage` behave
identically there today — kept as `manage` for owner/admin for consistency
and future-proofing, not because it currently means anything different.

## Enforcement architecture

**`src/lib/permissions.ts`** (new) — single source of truth:

```ts
export type TabDomain = 'overview' | 'candidates' | 'post-job' | 'manage-jobs'
  | 'companies' | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns'
  | 'legal' | 'billing' | 'team';

export type AccessLevel = 'none' | 'view' | 'manage';

export const PERMISSIONS: Record<StaffRole, Record<TabDomain, AccessLevel>> = { ... };

export function getAccessLevel(role: StaffRole, domain: TabDomain): AccessLevel;
export function hasAccess(role: StaffRole, domain: TabDomain, required: 'view' | 'manage'): boolean;
```

**`src/lib/auth.ts`** — new `requireTabAccess(domain, level)`, following the
existing `requireStaff()`/`requireRole()` pattern (same file, same style,
reads the session once, no new dependency):

```ts
export async function requireTabAccess(domain: TabDomain, level: 'view' | 'manage'): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  return !!role && hasAccess(role, domain, level);
}
```

Existing `requireStaff()`/`requireRole()` are untouched. Routes migrate from
`requireStaff()` to `requireTabAccess(domain, level)`; GET handlers require
`'view'`, mutating handlers (`POST`/`PATCH`/`DELETE`) require `'manage'`.

**Client-side** — `DashboardClient.tsx`'s `TABS` array filters out any tab
where `getAccessLevel(role, tab) === 'none'` before rendering the tab
switcher. This is UX polish (don't show a tab you can't use) — the server
check is what actually stops access; a filtered-out tab is not a security
control on its own.

**`/api/jobs` special case** — `POST`/`DELETE` currently check only a
static `x-admin-key` header against `ADMIN_KEY`, independent of login
session. That mechanism stays exactly as-is (out of scope to redesign);
`requireTabAccess('post-job'/'manage-jobs', 'manage')` is added as an
*additional* required check ahead of it, so both the session role and the
admin key must be valid. This is the one existing check this phase touches,
and only additively.

## Route → domain mapping

Representative grouping (exact per-route checklist enumerated in the
implementation plan):

| Domain | Routes |
|---|---|
| candidates | `/api/candidates*` (list, `[id]`, `job`, `cv-url`, `interview`, `consent`), `/api/analyze-cv` |
| billing | `/api/invoices*`, `/api/candidates/[id]/final-salary`, `/api/candidates/[id]/invoice` |
| companies | `/api/companies*` |
| enterprise | `/api/cse*`, `/api/contracts*`, `/api/interactions*`, `/api/enterprise/stats` |
| b2b-leads | `/api/leads*` |
| content | `/api/content/*` |
| campaigns | `/api/email/send`, `/api/email/status` |
| legal | `/api/legal/settings`, `/api/legal/consents-status` |
| team | `/api/staff*` (already `requireRole(['owner','admin'])` — left as-is; matches the `team` matrix row exactly, so no change needed here beyond confirming consistency) |
| post-job / manage-jobs | `/api/jobs*` (see special case above) |

Note the `candidates`/`billing` split: `final-salary` and `invoice` routes
are reachable from the Candidate Drawer (which lives inside the
`candidates` tab UI), but they're financial actions, so they're gated
under `billing`'s `manage` level, not `candidates`'s. Since `cse` has
`candidates: none`, this is currently moot for `cse`, but keeps the model
correct for `viewer` (who has `view` on both, consistent either way) and
any future role.

## Edge cases / accepted limitations

- **`/api/companies/[id]` PATCH is shared** between the `companies` tab
  (general edit) and the `legal` tab (commission-rate field). It's gated
  once, under `companies: manage`. A role with `companies: manage` but
  `legal: view` (i.e. `cse`) can technically change `commissionRatePct`
  through this route even though the Legal tab renders that field
  read-only for them. Field-level gating is out of scope for the two-level
  model; flagging so it's a documented tradeoff, not a missed bug.
- **`/api/email/send` is shared** between `campaigns` (bulk sending) and
  `companies` (one-off "email this company" button in `CompaniesView`).
  Gated uniformly under `campaigns: manage`. Since `cse` has
  `campaigns: none`, this removes that one button for `cse` even though
  they can manage companies otherwise. Documented; revisit if it turns out
  to be a real workflow gap for CSEs.
- **`overview`** has no mutating routes today, so `view` vs `manage` is a
  distinction without a difference there currently — see note above.

## Testing / verification

- `npx tsc --noEmit` after each task (no test suite exists in this repo).
- Manual click-through cannot be performed in this environment — the
  dashboard is gated behind Google OAuth as a live human account, which
  this session can't drive (same limitation noted in prior `PROGRESS.md`
  entries for the Billing subsystem). Recommend the admin spot-check a
  `cse` and a `viewer` login post-merge: confirm hidden tabs stay hidden,
  and confirm a direct `fetch()`/curl to a `manage`-gated route as a `cse`
  session returns 401.

## Out of scope (deferred, not forgotten)

- Row-level account scoping for `cse` (needs `Staff`↔`CseRep` linkage design)
- DB-backed configurable permissions UI
- Per-action (vs per-tab) granularity
- Sentry / Observability (Phase 5)
- Alerting/notifications
