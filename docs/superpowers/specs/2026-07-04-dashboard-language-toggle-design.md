# Dashboard Language Toggle — Design

Date: 2026-07-04

## Problem

The internal Admin Dashboard has no way to switch language. The public site (`Navbar.tsx`) has a `မြန်မာ`/`English` toggle button; the dashboard's `Sidebar.tsx` (shared by both the desktop rail and the mobile drawer) has none. Note: this is scoped to **just the toggle button** — translating the 13 tabs' actual content is a separate, much larger, explicitly deferred project (no Burmese copy has been supplied for it yet).

## Scope

One change: add a language-toggle button to `src/components/dashboard/Sidebar.tsx`.

- Import `useLanguage` from `@/contexts/LanguageContext` (not currently imported in this file).
- Add a `<button onClick={toggleLang}>` positioned directly above the existing collapse/expand button, inside the block that currently reads `{!isDrawer && (...)}` for the collapse button — extended so the *toggle* itself renders in both `rail` and `drawer` variants (only the *collapse* button stays rail-only, since "collapse" has no meaning in a full-width drawer).
- Label: reuses the existing `nav_lang_toggle` i18n key verbatim — no new translation key needed. This key already holds the *target* language name (`မြန်မာ` in English mode, `English` in Burmese mode), exactly matching `Navbar.tsx`'s existing usage.
- Styling: matches `Navbar.tsx`'s existing toggle button (small bordered pill, `text-xs font-semibold`).
- Collapsed-rail behavior: when the rail is collapsed to icon-only width (`collapsedRail` is already computed in this file), the button falls back to an icon-only rendering using lucide's `Languages` icon plus an `aria-label` — mirroring how the adjacent collapse button already switches between icon-only and icon+text depending on `collapsed` state.

## Out of scope

Translating any of the 13 dashboard tabs' actual content (candidates, companies, billing, etc.) — a separate, larger, not-yet-scoped project. No changes to `DashboardClient.tsx`, `LanguageContext.tsx`, or `i18n.ts`.

## Verification

- `npx tsc --noEmit` and `npm run lint` clean.
- Manual/browser check: toggle appears in both the desktop rail (expanded and collapsed states) and the mobile drawer; clicking it actually switches the dashboard's tab labels/banners (already wired via `t()` in `DashboardClient.tsx`) between English and Burmese; the collapsed-rail icon-only state renders correctly with a visible tooltip/aria-label.
