# Phase 11: Homepage Chooser Split + Dashboard Sidebar — Design Spec

## Context

Continues from Phase 10 (last real phase). Two decisions from the repo
owner, taken as given, not re-litigated here:

1. **Root page (`/`) becomes a "Chooser"** — a minimal screen with two
   buttons: one to `/candidate`, one to `/company`.
2. **Dashboard nav becomes a collapsible left sidebar**, replacing the
   current horizontal tab-switcher pill row.

**Important existing-state finding, changes the scope of Part A**: this
repo already has both audience-specific pages, just not routed as a
chooser. `src/app/page.tsx` (today's homepage: hero, job search/filter/
grid, stats, testimonials, alerts, community channels) is already the
candidate-focused experience. `src/app/hire-with-us/page.tsx` (hero, why-
us grid, stats, `HireForm`) is already a complete, working
company/employer-focused landing page. **Part A is a routing and homepage
change, not new landing-page content from scratch.**

**Second existing-state finding, relevant to Part B**: role-based tab
visibility already exists and is already correct.
`DashboardClient.tsx`'s `TABS = ALL_TABS.filter((tab) => getAccessLevel
(effectiveRole, tab.value) !== 'none')` (Phase 4) already restricts `cse`
to 6 of 13 tabs (Overview view-only, Companies/Enterprise/B2B Leads
manage, Legal/Billing view-only), and Phase 10 already scopes the actual
data within those tabs to the caller's linked CSE rep. **The sidebar
redesign is a presentation-layer change on top of already-correct access
logic, not a new access-control feature.**

## Part A: Homepage Chooser Split

### Goals

- `/` shows a clean, minimal chooser: two clear paths, no job listings, no
  forms, no clutter.
- `/candidate` is exactly today's homepage experience (job search, CV
  upload/talent-pool, alerts) — moved, not rebuilt.
- `/company` is exactly today's `/hire-with-us` experience — moved
  (renamed), not rebuilt.
- Existing links to `/hire-with-us` (if shared/bookmarked anywhere)
  continue to work via redirect.

### Non-goals

- Rewriting any homepage or hire-with-us content/copy. This phase moves
  files and routes; it does not redesign either destination page.
- A persistent "switch audience" mechanism (e.g. a cookie remembering
  which chooser button was clicked last time, auto-skipping the chooser
  on return visits). Not requested; flagging so it's a deliberate omission
  if raised later, not a forgotten idea.
- Changing `/apply/[jobId]`, `/drop-cv`, `/resume-builder`, `/my-
  applications`, `/login` — none of these are touched.

### Routing changes

| Route | Before | After |
|---|---|---|
| `/` | Today's homepage (`HomeClient`) | New Chooser page |
| `/candidate` | Doesn't exist | Today's homepage content, moved here verbatim |
| `/company` | Doesn't exist | Today's `/hire-with-us` content, moved here (renamed) |
| `/hire-with-us` | Full page | Redirect to `/company` (`permanent: true`) |

**File moves:**
- `src/app/page.tsx` → `src/app/candidate/page.tsx` (contents unchanged
  except `alternates.canonical` updated to the new path)
- `src/app/hire-with-us/page.tsx` → `src/app/company/page.tsx` (contents
  unchanged except canonical/OG paths)
- `src/app/hire-with-us/page.tsx` (new, thin): redirects to `/company`.
  Implemented via `next.config.ts`'s `redirects()` array (a permanent
  redirect, resolved at the edge — no page render needed at all), not a
  React component calling `redirect()`. Simpler and faster.

### The Chooser page (new `src/app/page.tsx`)

Full-bleed, centered layout. No `Navbar`/`Footer` (those carry candidate-
specific links like "Find Jobs"/"My Applications" that don't belong on a
neutral chooser) — just the Lion Jobs logo, a language toggle (top-right,
reusing `useLanguage()`/`toggleLang` exactly as `Navbar.tsx` does today),
and the two choice cards.

```
┌─────────────────────────────────────────┐
│  🦁 Lion Jobs                    မြန်မာ  │
│                                           │
│         [ headline: what brings you ]   │
│         [ sub: one line ]                │
│                                           │
│   ┌─────────────┐   ┌─────────────┐    │
│   │  🔍          │   │  🏢          │    │
│   │  I'm looking │   │  I'm hiring  │    │
│   │  for a job   │   │  talent      │    │
│   │  [Find Jobs] │   │ [Hire Talent]│    │
│   └─────────────┘   └─────────────┘    │
│                                           │
└─────────────────────────────────────────┘
```

New i18n keys (en/my, following existing naming convention):
`chooser_headline`, `chooser_sub`, `chooser_candidate_title`,
`chooser_candidate_sub`, `chooser_candidate_cta` (reuse existing
`nav_find_jobs`-style phrasing), `chooser_company_title`,
`chooser_company_sub`, `chooser_company_cta` (reuse existing "Hire
Talent" string already in `Navbar.tsx`).

### Consequential changes (not new decisions, just what the split requires)

- **`Navbar.tsx`**: "Find Jobs" link (`/#jobs`) → `/candidate#jobs`.
  "Hire Talent" link (`/hire-with-us`) → `/company`. Logo link stays `/`
  (now the Chooser) — standard convention, clicking the logo takes you
  back to the top-level choice.
- **`Footer.tsx`**: `QUICK_LINKS`' "Browse All Jobs" (`/#jobs`) →
  `/candidate#jobs`.
- **SEO — flagging, not deciding**: `/` today carries the job-board SEO
  metadata (title "Find Jobs in Myanmar", keywords, `revalidate: 3600`)
  and is presumably what's indexed/ranked by Google right now. Moving that
  content to `/candidate` means `/candidate` should inherit that metadata
  wholesale (straightforward), but `/` (the Chooser) needs its own
  metadata too, and existing search ranking for `/` will reset against a
  now-thin page. **Recommend**: `/candidate`'s metadata stays exactly what
  `/` has today (same title/keywords/OG), and `/` gets simpler metadata
  ("Lion Jobs Agency — Find Jobs or Hire Talent in Myanmar") plus a
  same-day 301 in `next.config.ts` isn't needed (root URL doesn't change,
  only its content does) — but this is worth a conscious sign-off before
  implementing, not something to silently decide, since it's the one part
  of this phase with real external-facing (SEO) consequences.

## Part B: Dashboard Sidebar

### Goals

- Replace the horizontal pill tab-switcher with a collapsible left
  sidebar (icon-only rail when collapsed, ~220px with labels when
  expanded).
- Preserve `TABS`' existing role-filtered contents and `activeTab` state
  logic exactly — this is a rendering change, not an access-control
  change.
- Collapsed/expanded state persists (localStorage, same pattern as the
  existing dark/light theme toggle).

### Non-goals

- Any change to `src/lib/permissions.ts`'s matrix, `requireTabAccess()`,
  or `getSessionScope()`. Phase 4/10's access control is untouched.
- Any change to what data Phase 10's CSE scoping returns. "CSE sees only
  their scoped data" is already true server-side; this phase only changes
  how the (already-correctly-filtered) tab list is *presented*.
- A fully custom design-system component library (e.g. adopting shadcn's
  `Sidebar` primitive, which isn't in `src/components/ui/` today and pulls
  in a context/cookie-persistence system of its own). Building a
  lightweight custom sidebar with this repo's existing Tailwind tokens is
  more consistent with `CLAUDE.md`'s "don't use arbitrary hex values,
  extend the token set" convention and everything else in
  `src/components/ui/`.

### Design

**New `src/components/dashboard/Sidebar.tsx`**: renders the same `TABS`
array `DashboardClient.tsx` already computes (passed in as a prop, not
recomputed), as a vertical list instead of horizontal pills. Collapse
toggle at the top/bottom of the rail. Collapsed: icon-only, ~64px wide,
tooltip on hover showing the label. Expanded: icon + label, ~220px wide.
Active tab gets the same `bg-background text-foreground shadow-sm`
treatment the pills use today — visual language carries over, only the
axis changes.

**`DashboardClient.tsx` restructure**: today's `<div>{pill row}</div>
{banner}{tab content}` becomes a flex row: `<div className="flex gap-6">
<Sidebar .../><main className="flex-1 min-w-0">{banner}{tab content}
</main></div>`. `activeTab`/`setActiveTab` state and every existing
`{activeTab === '...' && <View/>}` block are unchanged — only the nav
markup moves out into `Sidebar.tsx`.

**`dashboard/page.tsx` shell — flagging, not deciding**: this page
currently renders the *public* `Navbar` and `Footer` around the
dashboard (candidate-facing links like "Find Jobs"/"My Applications"/
"Hire Talent" appear on the internal staff tool today). Recommend
replacing both with a minimal dashboard-only bar (logo mark, role badge,
sign-out — no public nav links) as a natural companion to a "clean,
distraction-free" sidebar layout. This is a reasonable scope expansion
beyond "add a sidebar" literally, so calling it out for a yes/no rather
than assuming it.

**Default landing tab per role — new small decision, flagging for
confirmation**: today every role defaults to `overview` on load. `cse`
technically has `overview: view` access, but their actual working domain
is Companies/Enterprise/B2B Leads. Proposal: `owner`/`admin`/`viewer`
default to `overview` (unchanged); `cse` defaults to `enterprise` (their
primary surface) instead of `overview`. This is exactly the kind of
"distraction-free interface for CSE" outcome requested, but it's a UX
call, not implied by "add a sidebar" — flagging before building it in.

**Mobile**: below a breakpoint (matching existing `sm`/`md` Tailwind
convention already used throughout this codebase), the sidebar collapses
to a hamburger-triggered overlay drawer rather than a persistent rail —
same pattern `Navbar.tsx`'s existing mobile menu (`menuOpen` state) uses,
reused rather than reinvented.

### Testing / verification

- Extend Phase 9's Vitest harness: `Sidebar.tsx`'s collapse-state
  persistence logic (read/write localStorage key) is the only piece with
  non-trivial logic worth a unit test; the rest is markup/layout, better
  covered by the `browse` skill's live verification (as used this
  session) than by unit tests.
- Live-verify via headless browser, same approach as the i18n fix this
  session: load `/dashboard` as each role (or simulate via the existing
  `permissions.ts` matrix if a live multi-role login isn't available in
  this environment), confirm the sidebar shows exactly the tabs `TABS`
  already computes, confirm collapse/expand persists across reload.
- Confirm `/hire-with-us` still resolves (via the new redirect) for
  anyone with the old URL bookmarked or linked externally.

### Open decisions requiring sign-off before implementation

1. SEO metadata handling for the `/` → `/candidate` content move (Part A).
2. Whether to also strip the public `Navbar`/`Footer` from
   `dashboard/page.tsx`'s shell (Part B).
3. Per-role default landing tab (`cse` → `enterprise` instead of
   `overview`) (Part B).

Everything else in this spec is either already decided by the repo owner
or a direct, non-optional consequence of those decisions.
