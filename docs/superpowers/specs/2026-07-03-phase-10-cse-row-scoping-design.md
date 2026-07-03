# Phase 10: CSE Row-Level Data Scoping — Design Spec

## Context

Phase 4 (`docs/superpowers/specs/2026-07-03-phase-4-rbac-design.md`) gated
*which tabs/actions* a role can reach, but explicitly deferred *which rows*
within an allowed tab: "a `cse` role sees every company/lead, not just
their own assigned accounts." That gap is still open today — `CLAUDE.md`
and `CTO_HANDOVER.md` both still document it as known-and-deferred. This
phase closes it.

**Naming note**: this is called Phase 10, not Phase 4, even though an
earlier same-day advisory roadmap (informal, not a real spec) labeled it
"Phase 4." This repo already has a real, shipped Phase 4 (linked above) —
reusing that number would collide with actual history. Phase 9 (Ops
Hygiene + Doc Sync) was the last real phase; this continues from there.

**Enforcement location, corrected from the informal roadmap**: every
Supabase read in this app goes through the service-role key
(`src/lib/supabase.ts`, server-side only), which **bypasses RLS entirely**
regardless of what policies exist — `0006_enable_staff_rls.sql`'s own
comment confirms this is by design ("zero policies means the table is
fully locked to service-role-only access"). A Postgres RLS policy keyed to
a `cse`'s identity would therefore silently do nothing. Row-level scoping
in this app has to be enforced in the **application/accessor layer**, not
the database layer. Nothing below proposes a new RLS policy.

## Current data model (as it actually exists today)

- **`staff`** (`0005_add_staff.sql`): `id, email, name, role, active,
  created_at`. No link to `cse_reps`.
- **`cse_reps`**: `id, name, phone, email, active, created_at`. No link to
  `staff`. These are two independent tables today — a `cse`-role login
  (`staff` row) and a "CSE rep" (`cse_reps` row, used for CRM attribution)
  are not connected.
- **`contracts.cse_id`** — direct FK-ish reference to `cse_reps.id`.
  Exists today, already used.
- **`companies`** — **no direct CSE column**. `EnterpriseView.tsx`
  (client-side) derives "which CSE owns this company" by scanning all
  contracts for the most recent `status = 'Active'` one and taking its
  `cseId` — this is a UX-only filter-dropdown helper today, not a security
  boundary.
- **`interactions.logged_by_cse_id`** — records *who logged* an
  interaction, not an ownership/assignment field.
- **`b2b_leads`** — confirmed in Phase 7's log: **no CSE assignment field
  anywhere**. Leads have no owner concept in the data model at all today.

## Goals

- A `cse`-role staff member sees only companies/contracts assigned to
  their own linked CSE rep record, both in the dashboard UI and via direct
  API calls — closing the gap the same way Phase 4 closed the tab/action
  gap (server-enforced, not just UI-hidden).
- `owner`/`admin` behavior is completely unchanged (see everything, as
  today).
- `viewer` behavior is completely unchanged (this gap was only ever
  documented for `cse`; `viewer` already sees everything read-only by
  design, and that's not being revisited here).
- Reuse the existing companies↔contracts CSE-attribution derivation
  (`EnterpriseView.tsx`'s logic) rather than inventing a new one — just
  move the enforcement server-side.

## Non-goals (explicitly out of scope this phase)

- **B2B Leads scoping.** There is no assignment field on `b2b_leads` to
  scope by. Inventing one is a real product decision (are unclaimed leads
  a shared pool every `cse` should see until claimed, or does every lead
  need per-rep assignment from creation?) — not a technical afterthought
  of this phase. Flagging as its own future design question, not
  building a placeholder assignment scheme to force this phase closed.
- **Retroactive backfill of `staff.cse_rep_id`.** No data exists today to
  infer which `cse_reps` row an existing `cse`-role `staff` row
  corresponds to (they're different tables with no shared key — not even
  matching emails are guaranteed). Existing `cse` staff get `NULL` on
  migration and must be linked manually via Team & Access post-deploy.
- **Changing `requireTabAccess()`'s existing signature or behavior.** This
  phase adds a new, separate scope-lookup helper alongside it.
- **DB-backed configurable permissions**, **per-action granularity** —
  same non-goals as Phase 4, still true, not revisited.
- **`Interaction.loggedByCseId` semantics** — unrelated field (attribution
  of who logged an interaction), not touched by this phase's scoping.

## Data model change

One migration, `0011_add_staff_cse_rep_link.sql`:

```sql
ALTER TABLE staff ADD COLUMN cse_rep_id TEXT REFERENCES cse_reps(id);
```

Nullable, no default, no backfill (see Non-goals). Mirrors this repo's
fix-forward migration convention (`MIGRATIONS.md`) — additive, no edits to
already-applied migrations.

`Staff` type (`src/types/index.ts`) gains `cseRepId: string | null`.
`src/lib/db/staff.ts`'s `mapToStaff`, `createStaff`, and `updateStaff` are
extended to read/write it, following the exact pattern `role` already
uses in the same file.

## Session/identity plumbing

`authOptions.ts`'s `jwt` callback already attaches `token.role` from the
matched `staff` row at sign-in (`src/lib/authOptions.ts`). This phase adds
`token.cseRepId = staffMember?.cseRepId ?? null` right beside it, and the
`session` callback exposes `session.user.cseRepId`, exactly mirroring
`role`'s existing pattern — including the same caveat already documented
for role changes: **takes effect on next login, not immediately** (baked
into the JWT at sign-in).

New helper in `src/lib/auth.ts`, additive alongside `requireTabAccess()`
(not replacing it):

```ts
export async function getSessionScope(): Promise<{ role: StaffRole; cseRepId: string | null } | null> {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  if (!role) return null;
  return { role, cseRepId: session?.user?.cseRepId ?? null };
}
```

Routes that need row scoping call both `requireTabAccess()` (unchanged,
still the access gate) and `getSessionScope()` (new, only for routes that
need to know *whose* data to filter to).

## Enforcement — application-layer filtering

**Companies** (`GET /api/companies`, `src/lib/db/companies.ts`): today
`getCompanies()` returns every row unconditionally. Add a scoping step in
the route (not the accessor, since the accessor has no session access) —
after fetching companies and all contracts, filter to companies whose
most-recent-Active-contract `cseId` matches the caller's `cseRepId`, using
the *exact same derivation* as `EnterpriseView.tsx`'s `assignedCseByCompany`
(ported to a shared, testable helper rather than duplicated inline).
`owner`/`admin`/`viewer` bypass this filter entirely (unchanged behavior).

**Contracts** (`GET /api/contracts` family, `contracts.ts`): trivial by
comparison — `contracts.cse_id` already exists directly.
`getContracts(companyId?)` gains an optional `cseRepId?` parameter (same
pattern as its existing `companyId?` param); the route passes the caller's
`cseRepId` when role is `cse`.

**Interactions** (`GET /api/interactions`, `interactions.ts`): scoped
transitively — an interaction is visible to a `cse` only if its
`companyId` is in that same scoped company-id set. Not scoped by
`loggedByCseId` (that field means something different — see Non-goals).

**CSE rep roster** (`GET /api/cse`): **not scoped**. This returns
`cse_reps` names/contact info for coordination between reps, not customer
data — a `cse` seeing the names of other CSE reps isn't the gap this
phase is closing.

## Fail-closed default

A `cse`-role staff member with `cseRepId === null` (not yet linked — every
existing `cse` row, until an owner manually assigns them post-migration)
sees an **empty list** for Companies/Contracts/Interactions, not the full
unfiltered set. This is a visible, immediately-noticeable gap (empty
dashboard) rather than a silent one (unrestricted access) — matches this
repo's existing fail-closed posture from Phase 4.

## UI change

`TeamView.tsx`'s staff create/edit form gains a "Linked CSE Rep" dropdown,
populated from the existing `useCseReps()` hook, shown and editable only
when the form's role field is set to `cse`. Saves via `updateStaff()`'s
extended signature.

## Edge cases / accepted limitations

- **A company with no Active contract at all** (e.g. still `Lead` status,
  pre-contract) has no derivable CSE owner and is therefore invisible to
  every `cse` until a contract exists — matches the current client-side
  filter's behavior already in `EnterpriseView.tsx`, not a new gap
  introduced by this phase.
- **A company with multiple CSEs across contract history** (e.g.
  reassigned) — only the *most recent* Active contract's `cseId` counts,
  same as today's client-side derivation. A `cse` who lost an account via
  reassignment loses visibility into it the moment the new contract goes
  Active, which is the intended behavior, not a bug.
- **`owner`/`admin` acting as a `cse` for testing** — no impersonation
  mechanism exists or is proposed; testing this requires an actual
  `cse`-role login, same limitation every prior phase's verification
  section has already noted.

## Testing / verification

- Extend the Phase 9 Vitest harness: the shared companies↔contract
  derivation helper (ported out of `EnterpriseView.tsx`) is pure logic,
  unit-testable the same way `permissions.test.ts` tests `hasAccess()` —
  no mocking needed.
- The three scoped routes (`companies`, `contracts`, `interactions`) are
  DB-dependent and can't be meaningfully unit-tested without mocking
  `@supabase/supabase-js` — this repo has no such mocking infrastructure
  yet. Recommend adding a minimal Supabase mock as part of this phase's
  implementation (not deferred again) so these routes get real coverage
  rather than another "can't verify from this environment" note.
- Manual verification still requires a live `cse` login (OAuth-gated,
  same limitation as every prior phase) — recommend the repo owner link a
  test `cse` staff row to a `cse_reps` row post-deploy and confirm the
  Companies/Enterprise/B2B-Leads tabs show only assigned accounts (B2B
  Leads unchanged/unscoped, per Non-goals).

## Out of scope (deferred, not forgotten)

- B2B Leads assignment/scoping (needs its own product decision first)
- Retroactive backfill for existing `cse` staff rows
- Any RLS-based enforcement (architecturally ineffective here — see
  Context)
- DB-backed configurable permissions, per-action granularity (still
  Phase 4's non-goals, unchanged)
