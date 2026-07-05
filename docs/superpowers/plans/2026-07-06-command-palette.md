# Command Palette (Cmd+K) Implementation Plan

> **For agentic workers:** Executed inline under explicit CEO authorization (2026-07-06) for Roadmap Item #2. REQUIRED SUB-SKILL: superpowers:executing-plans conventions.

**Goal:** Single Cmd+K/Ctrl+K modal to search across Candidates, Companies, Jobs, B2B Leads, and Job Requests — CEO Roadmap Item #2.

**Architecture:** A pure `buildSearchResults()` function filters already-fetched full lists (same "fetch full list, filter in memory" model this repo already uses for dashboard management views, per `CLAUDE.md`'s note on `JobsPanel`/`AnalyticsOverview`) into a common `SearchResult` shape. A route handler fetches each domain's list only if the caller can view that tab (`hasAccess()`), same RBAC pattern as the Notification Inbox. A debounced hook (300ms, min 2 chars) calls it. A modal component owns the global keydown listener, arrow-key navigation, and click/Enter-to-navigate.

**Design decisions:**
- **No new search infrastructure** (no Postgres full-text search, no new tables) — substring match over existing full-list accessors, consistent with this app's current scale and existing client-filter precedent.
- **New accessor**: `listAllJobRequests()` (mirrors `listPendingJobRequests()` minus the status filter) — search needs to find approved/rejected requests too, not just pending ones. Small, additive, no migration.
- **Debounce via `setTimeout` inside `useEffect`, `setState` only in the timeout callback** — this is the documented escape hatch for `react-hooks/set-state-in-effect` (an external-timer callback, not a synchronous effect-body call), so it doesn't add to this repo's existing lint debt.
- **Cap 5 results per entity type, 25 total** — avoids one noisy domain (e.g. candidates) drowning out the others.
- **Global mount point**: `DashboardClient.tsx`, alongside `NotificationBell`, inside the `isAdmin` branch only.

**Tech stack:** existing accessors, Next.js route handler, plain `fetch` (no SWR — each keystroke is a fresh debounced request, not a cache-friendly key), lucide-react, Tailwind, Vitest.

---

### Task 1: Types

**Files:** Modify `src/types/index.ts`
- `SearchEntityType = 'candidate' | 'company' | 'job' | 'lead' | 'job_request'`
- `SearchResult { id, type: SearchEntityType, title, subtitle, href: NotificationTargetTab }` (reuses the tab-target literal union already added for notifications)

### Task 2: `listAllJobRequests()` accessor

**Files:** Modify `src/lib/db/jobRequests.ts` — same shape as `listPendingJobRequests()`, no `.eq('status', ...)` filter.

### Task 3: Pure `buildSearchResults()` + tests

**Files:** Create `src/lib/search.ts`, test `src/lib/search.test.ts`
- Case-insensitive substring match: candidates on `name`/`email`/`phone`; companies on `name`/`email`; jobs on `title`/`location`; leads on `companyName`/`contactName`/`workEmail`; job requests on `title`.
- Cap 5 per type, 25 total, empty query → `[]`.

### Task 4: `/api/search` route

**Files:** Create `src/app/api/search/route.ts`
- `requireStaff()` gate; per-type `hasAccess(role, domain, 'view')` before fetching that domain's list (candidates→`candidates`, companies→`companies`, jobs→`manage-jobs`, leads→`b2b-leads`, job requests→`manage-jobs`).
- Empty/short `q` (< 2 chars) short-circuits to `{ results: [] }` without touching the DB.

### Task 5: `useSearch` hook

**Files:** Create `src/hooks/useSearch.ts` — debounced (300ms) plain-fetch hook, no SWR.

### Task 6: `CommandPalette` component + global mount

**Files:** Create `src/components/dashboard/CommandPalette.tsx`, modify `DashboardClient.tsx`
- Global `keydown` listener for Cmd+K/Ctrl+K (open) and Escape (close); Up/Down to move selection, Enter to navigate via `onNavigate` + close.
- Mounted once, alongside `NotificationBell`.

### Task 7: Verify + commit

- `npx tsc --noEmit`, `npm test`, `npm run lint` (no new errors) — then branch, PR, CI, merge.
