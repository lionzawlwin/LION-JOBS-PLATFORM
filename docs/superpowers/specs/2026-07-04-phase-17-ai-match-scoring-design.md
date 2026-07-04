# Phase 17: Dashboard-Wide AI Match Scoring — Design Spec

**Status: spec only, cost/rate-limit design proposed but not
implemented — needs the repo owner's sign-off on the cost model before
any code runs against the real Anthropic API.**

## Context, corrected from the original CTO pitch

The original advisory framing was "AI candidate-job matching" as if
net-new. It isn't: `scoreCandidateAgainstJob()` (`src/lib/ai/
cvAnalyzer.ts`) already exists, already calls Claude (`claude-
haiku-4-5-20251001`, 512 max tokens per scoring call), and already has a
graceful **free fallback** — if `ANTHROPIC_API_KEY` is unset, or the AI
call fails, it falls back to `ruleBasedScore()` (keyword/skill overlap,
no API cost at all). Today this only runs one candidate against one job,
at apply-time. The actual net-new work is surfacing this **across the
whole pool** — a match-score column in the Candidates table, a
"Suggested Candidates" panel on Manage Jobs — not building AI scoring
from scratch.

## Why this needs sign-off before it's built, not just built

Haiku is cheap per call, but pool-wide is a multiplication problem, not a
per-call one: at this app's current scale (500+ candidates, some number
of open jobs), a **naive "score every candidate against every open job"
sweep is candidates × jobs API calls** — at even 50 open jobs that's
25,000 calls in one pass. Individually inexpensive, collectively a real
and easily-repeatable cost if triggered automatically or on a schedule
rather than deliberately.

## Proposed safe design (for approval, not decided unilaterally)

- **Manual trigger only**, not automatic/scheduled. An admin clicks
  "Suggest candidates" for one specific job, or "Score match" for one
  specific candidate against one job — never an unattended full-pool
  sweep.
- **The existing free `ruleBasedScore()` fallback becomes the default**
  for any bulk/list-level view (e.g., a match-score column showing for
  every row in the Candidates table simultaneously) — free, already
  built, no API cost regardless of pool size. AI scoring
  (`scoreCandidateAgainstJob()`, the paid path) is reserved for
  single-pair, explicitly-requested detail views only ("why is this a
  73% match" on one specific candidate-job pair), where the cost is one
  call, not thousands.
- **A hard cap on any batch operation** — e.g., "Suggested Candidates"
  for one job scores at most the top N (by the free rule-based score)
  candidates with the paid AI scorer, not the entire pool. N itself
  (20? 50?) is a product call for the repo owner, not decided here.

## Non-goals

- Automatic/scheduled re-scoring — manual trigger only, per above.
- Replacing the existing apply-time single-pair scoring flow — this
  phase adds a new, separate pool-wide surface, doesn't touch the
  existing one.
- A cost dashboard/budget alert system — a reasonable future addition if
  usage grows, not required to ship a correctly-bounded first version.

## What's needed before implementation

Sign-off on: whether manual-trigger-only is the right model, what the
batch cap (N) should be, and whether the free rule-based score should
really be what powers the always-visible list view (recommended here,
but a product call).
