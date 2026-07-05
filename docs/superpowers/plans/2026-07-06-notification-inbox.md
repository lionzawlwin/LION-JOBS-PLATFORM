# Notification Inbox Implementation Plan

> **For agentic workers:** Executed inline in the authorizing session under standing CEO/CTO autonomous-execution authority (2026-07-06) — no interactive brainstorming round; design decisions below are CTO-authored and documented for after-the-fact review, not pre-approved by a human. REQUIRED SUB-SKILL: superpowers:executing-plans conventions (bite-sized commits, test-first where testable).

**Goal:** Give staff a live, role-scoped feed of actionable items (pending job requests, unresolved system errors, unclaimed B2B leads, contracts expiring soon) via a bell+panel in the dashboard chrome — CEO Roadmap Item #1.

**Architecture:** A pure function (`buildNotifications`) composes `NotificationItem[]` from four **existing** accessors (`listPendingJobRequests`, `listSystemEvents`, `getB2bLeads`, `getContracts`) — no new table, no new migration. A route handler calls the accessors the caller's role can actually view (reusing `hasAccess()` from `permissions.ts`), passes results through the pure function, and returns JSON. A SWR hook polls it every 60s. A bell component renders count + dropdown, mounted once in `DashboardClient`.

**Design decisions (CTO-authored, no new state):**
- **No new `notification_reads` table / no per-user dismiss state.** These are live actionable queues (pending approvals, unclaimed leads), not ephemeral pings — a stale "dismissed but still pending" badge would be actively misleading for an ops team. Badge always reflects current truth. This is a deliberate scope cut, not an oversight — revisit only if staff feedback says otherwise.
- **RBAC**: each item type only computed if the caller's role has `view` on the relevant tab domain (`manage-jobs` for job requests, `system-health` for system events, `b2b-leads` for leads, `enterprise` for contracts) — reuses the existing single-source-of-truth matrix, no new permission concept.
- **Contract expiry window**: 30 days, `status !== 'Ended'`, `endDate` not null.
- **i18n**: `DashboardClient.tsx` (the mount point) already routes all its own chrome strings through `t()` — the bell follows that convention (unlike widget-level `ActivityLog.tsx`, which doesn't). New `nb_*` keys, en + Myanmar.

**Tech stack:** existing Supabase accessors (unchanged), Next.js route handler, SWR, lucide-react, Tailwind, Vitest.

---

### Task 1: `NotificationItem` type

**Files:** Modify `src/types/index.ts`

```typescript
export type NotificationType = 'job_request' | 'system_event' | 'unclaimed_lead' | 'contract_expiring';

export interface NotificationItem {
  id:        string;
  type:      NotificationType;
  title:     string;
  detail:    string;
  href:      TabDomain; // which dashboard tab to jump to
  createdAt: string;
}
```
(`TabDomain` already imported from `@/lib/permissions` where `types/index.ts` needs it — check existing imports; if not present, use a plain string literal union matching `TabDomain`'s values instead of importing, to avoid a circular import between `types` and `permissions`.)

- [ ] Step 1: Add the type, matching whichever import-safe form applies.
- [ ] Step 2: `npx tsc --noEmit` — expect PASS (unused export doesn't error).

### Task 2: Pure aggregator + tests

**Files:**
- Create: `src/lib/notifications.ts`
- Test: `src/lib/notifications.test.ts`

- [ ] Step 1: Write failing tests covering: job-request mapping, system-event mapping, unclaimed-lead filtering (`claimedByCseRepId === null`), contract-expiry window (30 days, excludes `Ended`, excludes null `endDate`), and sort order (newest actionable first).
- [ ] Step 2: Run `npx vitest run src/lib/notifications.test.ts` — expect FAIL (module doesn't exist).
- [ ] Step 3: Implement `buildNotifications({ jobRequests, systemEvents, leads, contracts, now })` — pure, no I/O, takes already-fetched arrays plus an injected `now: Date` (never call `Date.now()`/`new Date()` inside — matches this repo's existing pure-function testability pattern in `algorithmicMatch.ts`).
- [ ] Step 4: Run tests again — expect PASS.
- [ ] Step 5: Commit: `feat(notifications): add pure notification aggregator`.

### Task 3: API route

**Files:** Create `src/app/api/notifications/route.ts`

- [ ] Step 1: `GET` handler — `requireStaff()` gate (any active staff member; per-item RBAC happens below, not at the route boundary).
- [ ] Step 2: For each of the four domains, check `hasAccess(role, domain, 'view')` before calling its accessor (parallel `Promise.all` over only the allowed calls).
- [ ] Step 3: Pass results to `buildNotifications()` with `now: new Date()`, return `Response.json({ items, totalCount: items.length })`, `Cache-Control: no-store` (matches every other dashboard route's convention).
- [ ] Step 4: `npx tsc --noEmit` — expect PASS.

### Task 4: SWR hook

**Files:** Create `src/hooks/useNotifications.ts`

- [ ] Step 1: `useSWR('/api/notifications', fetcher, { refreshInterval: 60000, revalidateOnFocus: false })`, same shape as `useAuditLog.ts`.

### Task 5: Bell + panel component

**Files:** Create `src/components/dashboard/NotificationBell.tsx`

- [ ] Step 1: Bell icon (lucide `Bell`) + badge (count, capped display at "9+"), click opens a dropdown panel grouped by type, each row links via an `onNavigate(href: TabDomain)` prop (no react-router — `DashboardClient` owns `activeTab` state).
- [ ] Step 2: Empty state, loading state (mirror `ActivityLog.tsx`'s existing loading/error patterns for visual consistency).

### Task 6: i18n keys + wire into `DashboardClient`

**Files:** Modify `src/lib/i18n.ts`, `src/components/dashboard/DashboardClient.tsx`

- [ ] Step 1: Add `nb_title`, `nb_empty`, `nb_job_request`, `nb_system_alert`, `nb_unclaimed_lead`, `nb_contract_expiring` (en + mm), following the existing `jr_*` key-pair convention.
- [ ] Step 2: Mount `<NotificationBell onNavigate={setActiveTab} />` once at the top of `<main>` in `DashboardClient.tsx`, right-aligned above the context banner. Only rendered when `isAdmin` (matches the rest of the authenticated dashboard chrome).

### Task 7: Verify + commit

- [ ] `npx tsc --noEmit` — PASS
- [ ] `npm test` — PASS (new suite included)
- [ ] `npm run lint` — no *new* errors vs. main's pre-existing baseline (see Layer 4 PR precedent — pre-existing debt stays out of scope)
- [ ] Commit, push `feat/notification-inbox`, open PR, verify CI, merge.
