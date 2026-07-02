# Release & Branch Safety

## What happened (2026-07-02)

A PR was merged into `main` on GitHub against the **remote** copy of a feature
branch (`worktree-b2b-enterprise-crm`), which was 17 commits stale — the
entire Billing & Invoicing subsystem had only ever existed in a local
worktree and was never pushed. The merge succeeded silently: no failing
check, no warning. It was caught only because a later, unrelated direct push
to `main` was rejected as non-fast-forward, forcing a manual diff that
happened to reveal the gap.

Nothing in the repo's process would have caught this on its own. This
document exists to close that gap.

## The actual discipline (no tool can substitute for this)

**Push your local/worktree branch before opening or merging a PR from it.**
GitHub can only see what's been pushed. If work exists only in a local
worktree, a PR merge on GitHub has no way to know it's missing anything —
CI will pass, the merge will look clean, and the gap will be silent, exactly
like this incident. Before merging any PR, confirm the remote branch is
actually caught up:

```bash
git fetch origin <branch>
git log --oneline origin/<branch>..<local-branch>   # should be empty
```

## What's now automated

**`.github/workflows/ci.yml`** — runs on every PR into `main`: `npx tsc
--noEmit` and `npx next build`. Both were verified to succeed with zero
environment variables set (the Supabase client and every `src/lib/db/*`
accessor degrade gracefully — see `src/lib/supabase.ts`), so this check
needs no secrets and has no excuse to be flaky.

This catches type errors and build breakage before merge. It does **not**
catch a stale-but-passing branch like the incident above — that requires
the human discipline in the section above, or the branch-protection setting
below, which catches a narrower but related case.

## Branch protection on `main` — enabled 2026-07-03

Applied via `gh api -X PUT repos/lionzawlwin/LION-JOBS-PLATFORM/branches/main/protection`
with the authenticated repo owner's explicit go-ahead. Live settings (confirmed
by the API response at the time of applying):

1. ✅ Require a pull request before merging (`required_approving_review_count: 0`
   — a PR is mandatory, but no second approver is required, since this is a
   single-admin repo and GitHub doesn't allow self-approval)
2. ✅ Require status checks to pass before merging → `verify` (from `CI`)
3. ✅ Require branches to be up to date before merging (`strict: true`) — this
   forces a PR to be rebuilt against the latest `main` before it can merge,
   catching the case where `main` has moved on since the PR was opened. It does
   **not** catch the specific incident above (a stale PR *branch* content gap
   has nothing to do with `main`'s state) — that's what the fetch/log check
   above is for.
4. ✅ `enforce_admins: true` — these rules apply to the repo owner too, no bypass
5. `allow_force_pushes` / `allow_deletions`: both `false`

Direct `git push origin main` is now rejected outright — all changes, including
this file's own updates, must go through a PR that passes the `verify` check.
This document was itself updated via that flow (branch
`docs/branch-protection-enabled` → PR → merge), as the first live proof it
actually works.

To change these settings later: `gh api repos/lionzawlwin/LION-JOBS-PLATFORM/branches/main/protection`
(GET to inspect current state, PUT to change).

## Known gap, deliberately not closed here

`npm run lint` is not part of the CI gate yet. Locally it crashed with an
out-of-memory error while scanning build artifacts inside
`.claude/worktrees/*/​.next/` — untracked, worktree-local output that won't
exist in a CI checkout, so this is very likely a non-issue in CI, but it
hasn't been verified end-to-end in that environment. Add `npm run lint` as
a required CI step once that's confirmed clean.
