# Layers 7 & 8: Audit Log + AI Match Scoring — Pointer, Not a New Spec

Part of the Company Dashboard roadmap. Both layers already have complete,
thorough design specs written in an earlier session — re-reviewed
tonight, still accurate, not duplicated here.

## Layer 7 — Audit Log

See `docs/superpowers/specs/2026-07-04-phase-14-audit-log-design.md`.
Status unchanged: spec + plan only, deliberately not implemented in one
unsupervised pass (24 route files with `manage`-level mutations — a
missed call site is a silent gap in exactly the record a compliance
feature exists to guarantee).

**Sequencing note added tonight**: do this *after* Layer 6 (Dynamic
RBAC), not before — `role_permissions` writes are the single most
important thing this audit log needs to cover from day one, so building
the log first means instrumenting it twice.

## Layer 8 — AI Match Scoring (pool-wide)

See `docs/superpowers/specs/2026-07-04-phase-17-ai-match-scoring-design.md`.
Status unchanged: cost model proposed, **awaiting repo owner sign-off**
before any code runs against the real Anthropic API pool-wide. Not
built tonight — spending real API budget unsupervised, even under a
manual-trigger design, isn't a call to make alone while the repo owner
is asleep.

**Portal tie-in added tonight**: once approved, the natural
commercial framing isn't just "AI scoring exists" — it's a
**"Suggested Candidates" panel surfaced in the Company Portal itself**
(enterprise tier, per Layer 5), reusing the existing free
`ruleBasedScore()` fallback for the free/bulk view and gating the paid
Haiku-based scoring behind the same manual per-job trigger the phase-17
spec already proposes. This is what turns "we built AI matching" into
"clients see AI matching," which is where the actual commercial value
of this feature lives.
