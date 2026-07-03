# Phase 15: B2B Leads Assignment — Decision Needed

**Status: awaiting a product decision from the repo owner. Not
implemented, not decided by this session on the repo owner's behalf.**

## The gap

Phase 10 scoped Companies, Contracts, and Interactions to each `cse`'s
own accounts. B2B Leads couldn't be scoped the same way, because — per
Phase 7's own log, confirmed again this session — `b2b_leads` has no
assignment concept anywhere in the data model. Every `cse` currently sees
every lead, with no way to change that without inventing an assignment
scheme first.

## The actual decision (two real options, not a technical detail)

**Option A — Shared pool.** Every `cse` sees every unclaimed lead; the
first to act on one becomes associated with it (perhaps via the same
"most recent Active contract" pattern Companies already use, once a lead
converts to a contract). No new assignment field needed at the lead
stage itself — leads stay unscoped, only the downstream company/contract
they become already gets scoped by existing Phase 10 logic.

**Option B — Per-lead assignment.** Leads get an explicit owner from
creation (assigned by an owner/admin, or round-robin, or some other
rule), and `GET /api/leads` scopes to `cse.assigned_lead_owner ===
caller.cseRepId` the same way Companies/Contracts already do.

These produce genuinely different day-to-day workflows for your CSE
team — Option A rewards speed/initiative on a shared queue, Option B
guarantees predictable ownership but needs an assignment mechanism (who
assigns, and how) that doesn't exist today. This isn't something to
default on without your input; it changes how your team actually works.

## What happens once you decide

Whichever is chosen, the follow-up build is well-understood and similar
in shape to Phase 10's existing work:
- **Option A**: no schema change, minimal code — the derivation logic
  already exists as a pattern to reuse (`deriveActiveCseByCompany` in
  `src/lib/cseScope.ts`).
- **Option B**: needs a new `assigned_cse_rep_id` column on `b2b_leads`
  (migration, following the exact `staff.cse_rep_id` precedent from
  Phase 10), an assignment UI (who assigns a lead to whom), and scoping
  `GET /api/leads` the same way `GET /api/companies` already is.

Either is a normal, one-session build once you've picked. Nothing here is
blocked on missing information the way Phase 12 is — it's blocked on a
decision only you can make about how your team should actually work.
