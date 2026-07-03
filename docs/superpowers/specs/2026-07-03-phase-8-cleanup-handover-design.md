# Phase 8: Final Performance Optimization & CTO Handover — Design Spec

> **Status: DRAFT — awaiting repo owner review. Not approved. No implementation
> has started against this spec.**

## Context

Phases 4-7 built RBAC, observability, infra alerting, and CRM alerting. All
four followed the same process (design spec → plan → subagent-driven
implementation → review → PR → human merge) and all four are now live on
`main`. This phase is different in kind: instead of one new feature, it's a
grounded cleanup + handover pass, scoped to what was actually found by
inspecting this repo directly — not a generic "tech debt sprint" checklist.

Three concrete things were found while drafting this spec, not assumed:

1. **`npm run lint` currently crashes.** It ran out of heap memory
   (`FATAL ERROR: Ineffective mark-compacts near heap limit`) while trying to
   lint `.claude/worktrees/b2b-enterprise-crm/.next/dev/server/chunks/*.js` —
   a full compiled Next.js dev build sitting inside a stale git worktree.
   `eslint.config.mjs`'s `globalIgnores` has `".next/**"`, but that pattern
   only matches a top-level `.next/` next to the config file, not the nested
   one inside `.claude/worktrees/b2b-enterprise-crm/.next/`. Needs `"**/.next/**"`
   (or similarly rooted patterns for `out/**`, `build/**`).
2. **That worktree is stale and safe to remove.** `git worktree list` shows
   `.claude/worktrees/b2b-enterprise-crm` still registered on branch
   `worktree-b2b-enterprise-crm` (tip commit `aa6fc78`). `git merge-base
   --is-ancestor worktree-b2b-enterprise-crm main` confirms that commit is
   already merged into `main` — this was the Billing & Invoicing subsystem's
   working tree, fully landed. It's excluded from git via `.git/info/exclude`
   (not tracked), so removing it is local-only cleanup, not a repo change.
3. **`system_events` (Phase 5) has zero indexes beyond its primary key**,
   despite being queried by `category`, `route`, `level`, and a `created_at`
   range/order on every dashboard load of System Health *and* on every single
   cron invocation (`getCronStatus()` runs two `.eq('category','cron').eq('route',...)
   .order('created_at desc').limit(1)` queries — one per cron route — inside
   `runHealthCheck()`, which itself now runs daily alongside Phase 7's
   `runCrmDigest()`). Every other frequently-filtered foreign key in this
   schema already has an index (`contracts.company_id`/`cse_id`,
   `interactions.company_id`, `invoices.company_id`/`application_id`,
   `candidate_consents.application_id` — see `supabase/migrations/0002-0004`).
   `system_events` was the one table added since without one.

Additionally, this repo has no single onboarding/handover document written for
a human successor — `CLAUDE.md` is Claude-Code-specific operating
instructions, not a handover doc, and `PROGRESS.md` is a phase-by-phase
changelog, not an architecture/runbook summary. Both are excellent primary
sources to synthesize from, not replace.

## Goals

1. **Fix the broken lint config** — root-anchor `eslint.config.mjs`'s
   ignores (`"**/.next/**"`, `"**/out/**"`, `"**/build/**"`) so `npm run lint`
   no longer depends on no stray worktree ever existing on disk. Verify by
   actually running `npm run lint` to completion after the fix (currently
   impossible to run to completion at all).
2. **Remove the stale `b2b-enterprise-crm` worktree** — `git worktree remove
   .claude/worktrees/b2b-enterprise-crm` (its branch `worktree-b2b-enterprise-crm`
   is fully merged; confirmed above). Leave the branch ref itself alone unless
   the repo owner also wants it deleted — removing a worktree and deleting a
   branch are two different Actions with different reversibility, and only
   the worktree removal is unambiguously safe.
3. **Remove the 5 leftover `console.log` call sites** in `src/app/api/apply/route.ts`
   (3), `src/app/api/webhooks/publish-job/route.ts` (1), and
   `src/app/api/email/send/route.ts` (1) — all are success-path debug prints
   left over from before Phase 5 established `logFailure()`/`logCronSuccess()`
   as this repo's actual logging convention. `console.error` call sites in
   `src/lib/db/*.ts` accessors are explicitly **not** touched — those are a
   deliberate, pre-existing, documented pattern (return `[]`/`null` on a
   Supabase error rather than throw) and out of scope here.
4. **Add one migration** (`0009_add_system_events_indexes.sql`) indexing
   `system_events` on the columns actually queried: `(category, route,
   created_at DESC)` covers `getCronStatus()`'s exact query shape, and a
   separate index on `(created_at DESC)` covers `listSystemEvents()`'s
   unfiltered-by-category case (the System Health tab's default view).
5. **Write `CTO_HANDOVER.md`** at the repo root — a synthesis, not a rewrite,
   of `CLAUDE.md` + `PROGRESS.md` + the 8 spec docs, aimed at a human
   successor rather than an AI agent: system architecture in plain language,
   every environment variable and where it lives (Vercel Production/Preview),
   the deploy pipeline, the migration process, a short "if X breaks, check Y"
   runbook section (cron silence, CRON_SECRET rotation, Supabase RLS
   surprises per `MIGRATIONS.md`'s staff-table lesson), and known gaps
   (per-role RBAC row-level scoping, Sentry alerting rules, the still-open
   question of whether `system_events` was actually empty due to the cron
   never firing vs. the CRON_SECRET issue — see `PROGRESS.md`'s Phase 7 log).

## Non-goals

- **No general "delete anything that looks unused."** Every file/line touched
  in this phase is one specifically identified above, with the grep/command
  output that justifies it. No speculative deletions of components, routes,
  or exports without a concrete reference-count check first (e.g. `grep -rl`
  showing zero importers).
- **No new Sentry alert rules, no dashboard UI changes, no new env vars.**
- **No schema changes beyond the one additive migration in Goal 4** — no
  column drops, no renames, nothing that could break a running query.
- **No touching `sheets.ts`/`makeWebhook.ts`** — those are already fully
  removed per `CLAUDE.md`; nothing to clean up there.
- **No deleting the `worktree-b2b-enterprise-crm` branch ref** unless the
  repo owner explicitly asks in review — only the worktree directory itself.
- **No pruning `feat/phase-5-observability` / `feat/phase-7-crm-alerting`
  local branches** as part of this phase's implementation — noted as an
  optional, separate, zero-risk cleanup the repo owner can do themselves
  (`git branch -d <name>`) whenever, not something worth a task/commit here.
- **CTO_HANDOVER.md is documentation only** — it does not change behavior,
  and this spec does not treat writing it as satisfying any of Goals 1-4.

## Architecture / Approach

Task-by-task, same process as every prior phase (spec → plan → subagent-driven
implementation → code-quality review → PR → human merge):

1. Fix `eslint.config.mjs` ignores. Verify: `npm run lint` runs to completion
   (pass or fail on real findings — either is fine, "doesn't crash" is the bar).
2. `git worktree remove .claude/worktrees/b2b-enterprise-crm`. Verify:
   `git worktree list` no longer shows it; `git status` still clean.
3. Remove the 5 `console.log` lines. Verify: `npx tsc --noEmit` clean, and a
   grep confirming `console.log` count in `src/` dropped from 5 to 0 (or to
   whatever's left after excluding the db-accessor `console.error` sites,
   which is a different grep pattern and untouched).
4. Write and apply `0009_add_system_events_indexes.sql`, update
   `supabase/MIGRATIONS.md`'s numbering table, `supabase db push`, verify with
   `supabase migration list`.
5. Write `CTO_HANDOVER.md`.
6. Final verification + `PROGRESS.md` entry + push branch, same as every
   prior phase — PR opened for human review and merge, not auto-merged.

## Testing / verification

- `npx tsc --noEmit` after any `.ts`/`.tsx` change.
- `npm run lint` must complete (this is itself the regression test for Goal 1
   — it currently cannot complete at all).
- `npx supabase migration list` confirms local/remote agree through `0009`.
- Cannot verify the new `system_events` indexes actually improve query
  latency from this environment (no access to Supabase's query planner/`EXPLAIN
  ANALYZE` output or production query volume) — this is a correctness-and-
  coverage index addition justified by the query shapes already in the code,
  not a benchmarked performance claim. Recommend the repo owner spot-check via
  Supabase's dashboard query performance panel post-merge if they want to
  confirm the before/after difference.

## Out of scope (deferred, not forgotten)

- Broader unused-file/dead-export audit beyond the 3 files + 1 worktree
  identified above.
- Per-role RBAC row-level scoping for `cse` (flagged as a known gap in
  `CTO_HANDOVER.md`, not built here — this was already deferred explicitly in
  Phase 4).
- Sentry alert-rule configuration (that's Sentry-dashboard-side config, not
  this codebase, per Phase 6's own explicit non-goal).
- Resolving the still-open "why was `system_events` empty" question from
  Phase 7's post-merge log — `CTO_HANDOVER.md` documents it as a known open
  item, it isn't re-investigated as part of this phase.
