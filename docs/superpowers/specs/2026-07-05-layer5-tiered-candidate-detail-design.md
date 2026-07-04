# Layer 5: Tiered Candidate Detail + Analytics Panel — Design Spec

Part of the Company Dashboard roadmap, Layer 5 of 10. **Spec only —
needs a real business decision, not just a code change.**

## The opportunity

`companies.tier` (`'smb' | 'enterprise'`) exists on every company row and
is captured (visible in the Portal's own `/me` response today) but
**gates nothing**. This is the first genuine monetization lever in the
roadmap: today Basic and Enterprise clients get an identical portal
experience.

## Proposed gate (for the repo owner to confirm, not decided here)

- **`smb` tier**: today's experience — aggregate funnel counts only
  (Applied/Shortlisted/Interview/Hired), no individual names.
- **`enterprise` tier**: adds a per-job "Shortlisted Candidates" list —
  name + stage only (still **not** phone/email/CV — Sprint 2's own
  reasoning for withholding contact info from any employer, to keep this
  a staffing-agency placement model rather than a self-serve job board,
  applies regardless of tier).
- **Analytics panel** (time-to-fill, applicant volume trend per job,
  vs. this agency's own historical averages by category) — `enterprise`
  only, computed server-side in `/api/company-portal/me`, no new table
  needed (derivable from existing `applications`/`jobs` timestamps).

## Why this is a decision, not just an implementation

- Whether **candidate names** (even without contact info) are
  appropriate to show any employer at all is exactly the call Sprint 2
  deliberately deferred rather than defaulting into unilaterally.
- Tier is currently set manually by staff (`updateCompanyTier` in
  Companies tab) with no pricing/contract tied to it yet — this spec
  assumes tier already reflects what a client is paying for, which may
  not be true today. Worth confirming before code treats it as a paywall.

## Implementation shape (once approved)

- `/api/company-portal/me`: branch on `company.tier`, add
  `shortlistedCandidates` (name + stage, per job) and `analytics` keys
  only for `enterprise`.
- `CompanyPortalClientImpl.tsx`: render the extra sections conditionally;
  `smb` companies see an unobtrusive "Upgrade for candidate-level
  visibility" hint, not a broken/empty section.
