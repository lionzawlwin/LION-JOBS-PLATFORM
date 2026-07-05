# Audit Log / Activity Trail — Design Spec

Revalidation and update of the original Phase 14 spec
(`docs/superpowers/specs/2026-07-04-phase-14-audit-log-design.md`), which
was written and approved in principle but deliberately left unbuilt twice
— both times for the same reason: a ~24-file rollout was judged too large
to execute unsupervised in one pass, with real risk of silent, inconsistent
coverage. That risk doesn't apply here: this is a normal interactive
session with the repo owner able to review each domain's instrumentation
as it lands, the same process Phase 4's original RBAC rollout (also ~30
files) used. Brainstormed and approved 2026-07-05.

## Context

`system_events` (Phase 5) records *failures* — `logFailure()` calls at
catch blocks. Nothing records successful mutations: who changed a
candidate's stage, who edited a contract's value, who deleted a company.
For a platform whose CRM touches contracts and billing, "who changed this
and when" is a real, currently-unanswerable question.

## Goals

- A new `audit_log` table recording: actor (staff email), action (create/
  update/delete), domain, entity type + ID, and a timestamp.
- Populated by a single `logAudit()` helper, called from every mutating
  route — additive, not a replacement for `logFailure()` (a route can both
  audit-log a successful mutation and failure-log if it later throws;
  they're not mutually exclusive).
- A read surface: an "Activity" panel inside the existing Team & Access
  tab, adjacent to the staff roster. No new dashboard tab, no new nav
  entry.

## Non-goals

- **Field-level diffs** (old value → new value). Recording *that* a
  mutation happened and *who* did it is the actual gap; recording exactly
  *what changed* is a larger, separate feature (would need snapshotting
  the full row before/after on every write) — a legitimate future
  extension, not required to close today's gap.
- **Retroactive backfill.** Only mutations from the moment this ships
  forward are recorded — matches this repo's existing convention (Phase
  10's `cse_rep_id` link also had no backfill, for the same reason: no
  reliable data to backfill from).
- **Auditing `GET`/view-only routes.** Only actual mutations.
- **Auditing public, unauthenticated routes** (`POST
  /api/candidates/[id]/consent`, the public apply flow) — these aren't
  staff actions, there's no "actor" to attribute them to in the same
  sense.

## Data model

New migration `0021_add_audit_log.sql` (renumbered from the original
spec's now-stale `0012` — `0012` was since claimed by
`0012_add_lead_claiming.sql`; `0021` is the next free slot per
`supabase/MIGRATIONS.md`):

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  domain      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- No policies, matching every other table's service-role-only access
-- pattern (see 0006_enable_staff_rls.sql's precedent).

CREATE INDEX IF NOT EXISTS audit_log_domain_created_idx
  ON audit_log (domain, created_at DESC);
```

## `logAudit()` helper

New `src/lib/audit.ts`, reusing the exact `getServerSession(authOptions)`
pattern already used in `auth.ts`'s `requireStaff()`/`requireRole()`/
`requireTabAccess()`:

```ts
export async function logAudit(data: {
  action: 'create' | 'update' | 'delete';
  domain: TabDomain | 'staff' | 'role-permissions';
  entityType: string;
  entityId: string;
}): Promise<void> {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email;
  if (!actorEmail) return; // no session, nothing to attribute -- fail silent, not throw
  await appendAuditLog({ actorEmail, ...data }).catch(() => {});
}
```

Never throws (matches `logFailure()`'s own documented "never throws"
contract) — an audit-log write failure must not break the mutation it's
recording. `domain` widens beyond `TabDomain` to also cover `staff` and
`role-permissions`, since both are role-gated rather than tab-gated but
are real mutation surfaces worth auditing.

## Rollout scope — 29 route files (re-grepped 2026-07-05, not assumed)

The original spec's 24, unchanged: `analyze-cv`, `candidates/[id]/cv-url`,
`candidates/[id]/final-salary`, `candidates/[id]/interview`,
`candidates/[id]/job`, `candidates/[id]`, `candidates/[id]/stage`,
`companies`, `companies/[id]`, `content/distribute` (still a 501 stub —
audited as a no-op call site now, becomes meaningful once that feature
ships), `contracts`, `contracts/[id]`, `cse`, `cse/[id]`, `email/send`,
`interactions`, `interactions/[id]`, `invoices`, `invoices/[id]`, `jobs`,
`jobs/[id]`, `leads/[id]`, `leads/[id]/status`, `legal/settings`.

Plus `staff`/`staff/[id]` (role-gated, not tab-gated, but still a
mutation surface worth auditing — arguably the *most* important one,
since it's who can manage who).

**New since the original spec was written, added to scope by explicit
repo-owner decision (2026-07-05):**
- `leads/[id]/release` — Phase 15's follow-up release/reassignment route.
- `system-events/[id]/resolve` — the system-event resolved-state feature.
- `role-permissions` — Layer 6 Dynamic RBAC's write endpoint. This route
  already has its own bespoke audit trail via the `permission_changes`
  table (Layer 6, Step 1/3) — that existing specialized log is untouched.
  This adds a *second*, general-purpose `audit_log` entry alongside it,
  for cross-domain activity-feed consistency (so the Team & Access
  Activity panel shows RBAC changes in the same feed as everything else,
  without having to special-case a different table's shape into the UI).

Recommend rolling out domain-by-domain (Candidates, then Billing, then
Companies, etc.), each as its own reviewed task — same process Phase 4's
RBAC migration used for the same reason (a large, repetitive,
easy-to-miss-one-file rollout benefits from per-domain review, not one
giant unreviewed sweep).

## UI — Activity panel

Inside the existing Team & Access tab, adjacent to the staff roster. New
`GET /api/audit-log` route, role-gated `owner`/`admin` (same level as
`/api/staff/*`), returning the most recent 100 entries (matching
`listSystemEvents()`'s existing cap in `src/lib/db/systemEvents.ts`),
optionally filtered by a `?domain=` query param. Table view: timestamp,
actor email, action, domain, entity type + ID.

## Testing

- `logAudit()`'s "no session → no-op" branch is a pure, mockable unit test
  (mock `getServerSession`) — added to the Vitest suite alongside
  `permissions.test.ts` et al.
- A static grep-based check confirming every one of the 29 listed route
  files actually contains a `logAudit(` call post-implementation (does
  not replace human review, but catches an accidentally-skipped file
  mechanically).
- Full end-to-end verification (does the Activity panel render correctly,
  do entries actually appear after a real mutation) needs a live
  authenticated click-through — same OAuth-gated dashboard limitation
  every prior phase in this repo has hit. Flagged for the repo owner to
  spot-check post-merge, not silently assumed to work.
