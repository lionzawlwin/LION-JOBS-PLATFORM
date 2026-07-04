# Phase 14: Audit Log / Activity Trail — Design Spec

**Status: spec + plan only, not implemented.** Judged too large a surface
area (24 route files with `manage`-level mutations, confirmed by grep
before writing this, not estimated) to safely execute unsupervised in one
overnight pass. A missed or inconsistent call site here is a silent gap in
exactly the kind of record a compliance/audit feature exists to guarantee
— the risk of a partial, undetected rollout is worse than not building it
yet. Real implementation should happen with the repo owner able to review
each domain's instrumentation as it lands, same as Phase 4's original RBAC
rollout (also ~30 files) did.

## Context

`system_events` (Phase 5) records *failures* — `logFailure()` calls at
catch blocks. Nothing records successful mutations: who changed a
candidate's stage, who edited a contract's value, who deleted a company.
For a platform whose CRM touches contracts and billing, "who changed
this and when" is a real, currently-unanswerable question.

## Goals

- A new `audit_log` table recording: actor (staff email), action (create/
  update/delete), domain (matching `TabDomain` for consistency with the
  existing RBAC vocabulary), entity type + ID, and a timestamp.
- Populated by a single `logAudit()` helper, called from every mutating
  route — additive, not a replacement for `logFailure()` (a route can
  both audit-log a successful mutation and failure-log if it later
  throws; they're not mutually exclusive).
- A read surface: a new "Activity" panel, most naturally added to the
  Team & Access tab (adjacent to who's on the roster) or as its own
  small section — final placement is a UI call, not decided here.

## Non-goals

- Field-level diffs (old value → new value). Recording *that* a mutation
  happened and *who* did it is the actual gap; recording exactly *what
  changed* is a larger, separate feature (would need snapshotting the
  full row before/after on every write) — a legitimate future extension,
  not required to close today's gap.
- Retroactive backfill. Only mutations from the moment this ships forward
  are recorded — matches this repo's existing convention (Phase 10's
  `cse_rep_id` link also had no backfill, for the same reason: no
  reliable data to backfill from).
- Auditing `GET`/view-only routes. Only actual mutations.
- Auditing public, unauthenticated routes (`POST /api/candidates/[id]/
  consent`, the public apply flow) — these aren't staff actions, there's
  no "actor" to attribute them to in the same sense.

## Data model

New migration `0012_add_audit_log.sql`:

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

New `src/lib/audit.ts`:

```ts
export async function logAudit(data: {
  action: 'create' | 'update' | 'delete';
  domain: TabDomain;
  entityType: string;
  entityId: string;
}): Promise<void> {
  const session = await getServerSession(authOptions);
  const actorEmail = session?.user?.email;
  if (!actorEmail) return; // no session, nothing to attribute — fail silent, not throw
  await appendAuditLog({ actorEmail, ...data });
}
```

Never throws (matches `logFailure()`'s own documented "never throws"
contract) — an audit-log write failure must not break the mutation it's
recording.

## Rollout scope (24 route files, grepped directly)

`requireTabAccess(..., 'manage')` currently gates these files:
`analyze-cv`, `candidates/[id]/cv-url`, `candidates/[id]/final-salary`,
`candidates/[id]/interview`, `candidates/[id]/job`, `candidates/[id]`,
`candidates/[id]/stage`, `companies`, `companies/[id]`,
`content/distribute`, `contracts`, `contracts/[id]`, `cse`, `cse/[id]`,
`email/send`, `interactions`, `interactions/[id]`, `invoices`,
`invoices/[id]`, `jobs`, `jobs/[id]`, `leads/[id]`, `leads/[id]/status`,
`legal/settings`. Plus `staff`/`staff/[id]` (role-gated, not
tab-gated, but still a mutation surface worth auditing — arguably the
*most* important one, since it's who can manage who).

Recommend rolling out domain-by-domain (Candidates, then Billing, then
Companies, etc.), each as its own reviewed task — same process Phase 4's
RBAC migration used for the same reason (a large, repetitive,
easy-to-miss-one-file rollout benefits from per-domain review, not one
giant unreviewed sweep).

## Testing

- `logAudit()`'s "no session → no-op" branch is a pure, testable unit
  (mock `getServerSession`).
- Full end-to-end verification (does every one of the 24 files actually
  get instrumented, none missed) needs a live authenticated click-through
  per domain — same OAuth-gated limitation every dashboard-UI phase this
  session has hit.
