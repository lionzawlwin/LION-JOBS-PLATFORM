# /company Page Localization — Design

Date: 2026-07-04

## Problem

`/company`'s navbar translates correctly (via `Navbar.tsx`'s existing `useLanguage()`/`t()` wiring), but the page's own content — Hero copy, the "Why Partner With Us?" section, and the hiring-request form — is entirely hardcoded English, regardless of the selected language.

## Scope

Wire exactly the 28 strings the repo owner supplied Burmese translations for. Everything else on the page stays hardcoded English this round (explicit decision, not an oversight) — see "Out of scope" below.

### Structural constraint

`src/app/company/page.tsx` is a Server Component (it exports Next.js `metadata`, which Client Components cannot do). `useLanguage()`/`t()` require a Client Component. So translated content can't just be wrapped in place inside `page.tsx` — it has to live in a Client Component boundary, same pattern this codebase already uses for `/candidate` (`page.tsx` server component renders `HomeClient`, a Client Component, for the translated/interactive homepage content).

### Changes

1. **`src/lib/i18n.ts`** — add 28 new keys × `en`/`my` under a new `// Company / Hire page` comment section:
   - `hire_page_why_title`, `hire_page_why_desc`
   - `hire_page_why_prescreened_title` / `_desc`, `hire_page_why_turnaround_title` / `_desc`, `hire_page_why_quality_title` / `_desc`, `hire_page_why_expertise_title` / `_desc`, `hire_page_why_zerocost_title` / `_desc`, `hire_page_why_e2e_title` / `_desc`
   - `hire_form_title`, `hire_form_sub`
   - `hire_form_company_info_title` / `_sub`, `hire_form_company_name`, `hire_form_industry`, `hire_form_location`, `hire_form_website`
   - `hire_form_contact_title` / `_sub`, `hire_form_full_name`, `hire_form_job_title`, `hire_form_work_email`, `hire_form_phone`

2. **New: `src/components/hire/WhySection.tsx`** (Client Component) — extracts the "Why Partner With Us?" heading, its paragraph, and the 6 feature cards (icon/color stay identical) out of `company/page.tsx`. Cards keyed by a stable `id` (`prescreened`, `turnaround`, `quality`, `expertise`, `zerocost`, `e2e`) instead of the current literal-title `key` prop, since titles are now translation lookups rather than literal strings.

3. **`src/components/hire/HireForm.tsx`** — add `useLanguage()`. Wire: the "Company Information"/"Contact Person" section headers + subtitles, and the 8 field `<label>`s (Company Name, Industry, Location/City, Company Website, Full Name, Job Title/HR Title, Work Email, Phone/WhatsApp). Also absorbs the "Submit Your Hiring Request" header + subtitle (currently living in `page.tsx` just above `<HireForm />`) — moved here since it also needs `t()`, and rendered above *both* the form and the post-submit success screen (a small restructure: wrap the existing return in a fragment with the header as a sibling before the `submitted`-branch conditional, so the header persists across both states, matching current behavior).

4. **`src/app/company/page.tsx`** — remove the module-level `WHY_US` const and its now-unused icon imports (`Users`, `Clock`, `Shield`, `Star`, `TrendingUp`); render `<WhySection />` in that spot. Remove the "Submit Your Hiring Request" header block (moved into `HireForm.tsx`); the card wrapper `div` now renders just `<HireForm />`.

### Out of scope (explicit, per repo-owner decision)

Hero badge/headline/subhead/stats, the testimonial quote, the "Our Simple Process" 4 steps, the entire Hiring Requisition form section (job title/role, headcount, work setup, salary budget, urgency, the requirements/job-description/benefits tabs, message to agency), the post-submit success screen text, the submit button, zod validation error messages, and the security disclaimer footer — all remain hardcoded English. Page `metadata` (SEO title/description) is unaffected either way since it's server-rendered independent of client-side language state, matching every other page in this app.

## Verification

- `npx tsc --noEmit` and `npm run lint` clean.
- Manual/browser check: toggle language on `/company` in both `en` and `my`; confirm the 28 wired strings switch correctly and every explicitly-out-of-scope string stays in English in both modes (i.e., nothing was accidentally left half-wired).
