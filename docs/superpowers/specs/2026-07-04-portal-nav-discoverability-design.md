# Portal Nav Discoverability — Design

Date: 2026-07-04
Related: Sprint 2 (`PROGRESS.md` "Sprint 2: Company Portal + Candidate Portal (Phases 23/24)"), which flagged: "No navigation links to either portal's login page yet (footer, company page, etc.) — deliberately out of scope for 'foundation'."

## Problem

The Company Portal (`/company/portal`, login at `/company/portal/login`) and Candidate Portal (`/candidate/portal`, login at `/candidate/portal/login`) both work end-to-end (magic-link request, verify, session, logout — shipped in PR #38) but are unreachable from any public page. A company or candidate who wants to log in has no way to discover the URL.

## Scope

Three additive UI changes, no auth/data/schema changes:

1. **Footer** (`src/components/layout/Footer.tsx`) — add "Employer Login" (`/company/portal/login`) and "Candidate Login" (`/candidate/portal/login`) as two small text links in the existing bottom bar, next to the copyright line. Plain hardcoded English strings — not wired through `t()`/`TranslationKey`, consistent with both portals being English-only for this first pass (matches the System Health precedent noted in Sprint 2's log).
2. **`/company` page** (`src/app/company/page.tsx`) — add "Already a client? Log in" next to the existing "Back to Job Board" link at the top of the hero section, pointing to `/company/portal/login`.
3. **`/candidate` hero** (`src/components/landing/HeroSection.tsx`) — add "Already applied? Track your status" near the trust strip at the bottom of the hero, pointing to `/candidate/portal/login`.

**Incidental fix, same file as #3**: the existing "Hire Talent" CTA card in `HeroSection.tsx` links to `/hire-with-us` (pre-Phase-11 URL, still works only via the redirect Phase 11 added). Since this file is already being edited, update that link to `/company` directly.

## Explicitly out of scope

- i18n for the new links or either portal (separate, already-deferred follow-up).
- The `company_id` FK / name-string-matching fix (separate, already-deferred follow-up).
- Any change to portal auth, session, or API routes — this is presentation-only.
- Navbar changes — decided against in brainstorming, to avoid adding a 4th/5th action to the navbar every plain job-seeker visitor sees.

## Verification

- `npx tsc --noEmit` and `npm run lint` clean.
- Manual check (dev server or `browse` skill): all three new links resolve to the correct portal login pages; the fixed `/company` link no longer round-trips through the `/hire-with-us` redirect.
