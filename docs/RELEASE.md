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

## Manual step required (repo admin only — not done yet)

Branch protection on `main` has **not** been enabled — this needs to be
done by hand in the GitHub UI (Settings → Branches → Add rule), since it's
a repo-level setting change outside what should be automated by an agent
without your direct sign-off:

1. Branch name pattern: `main`
2. ✅ Require a pull request before merging
3. ✅ Require status checks to pass before merging → select `verify` (from
   `CI`, once it has run at least once)
4. ✅ Require branches to be up to date before merging — this forces a PR
   to be rebuilt against the latest `main` before it can merge, catching
   the case where `main` has moved on since the PR was opened. It does
   **not** catch the specific incident above (a stale PR *branch* content
   gap has nothing to do with `main`'s state) — that's what the fetch/log
   check above is for.
5. ✅ Do not allow bypassing the above settings (applies rules to admins too)
6. Leave "Allow force pushes" and "Allow deletions" unchecked

Once enabled, direct `git push origin main` will be rejected outright —
all changes must go through a PR, which must pass CI.

## Known gap, deliberately not closed here

`npm run lint` is not part of the CI gate yet. Locally it crashed with an
out-of-memory error while scanning build artifacts inside
`.claude/worktrees/*/​.next/` — untracked, worktree-local output that won't
exist in a CI checkout, so this is very likely a non-issue in CI, but it
hasn't been verified end-to-end in that environment. Add `npm run lint` as
a required CI step once that's confirmed clean.
