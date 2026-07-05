# Audit Log Explorer Implementation Plan

> **For agentic workers:** Executed inline under standing CEO/CTO autonomous-execution authority (2026-07-06) — no interactive brainstorming round; design decisions below are CTO-authored. REQUIRED SUB-SKILL: superpowers:executing-plans conventions.

**Goal:** Upgrade the existing but minimal Audit Log (`ActivityLog.tsx`, one domain-filter dropdown, 100-row cap, no search/export) into a real explorer — actor/action/date-range/free-text filters, pagination beyond 100, CSV export — CEO Roadmap Item #3.

**Architecture:** Extend the existing `listAuditLog()` accessor and `/api/audit-log` route with more filter params instead of adding new files/tables (the `audit_log` table from migration `0021` already has everything needed — `actor_email`, `action`, `domain`, `entity_type`, `entity_id`, `created_at`). Query-param parsing/validation is extracted into a small pure function (`parseAuditLogQuery`) so it's unit-testable without a Supabase mock — mirrors this repo's existing convention (pure logic gets tests; DB accessors don't, per `CLAUDE.md`'s testing note). CSV export reuses the same query via a `format=csv` param rather than a second route file.

**Design decisions (CTO-authored):**
- **No new migration** — table already has every column needed.
- **No new route file for export** — `GET /api/audit-log?format=csv&...` returns `text/csv` using the identical filtered query, avoiding duplicated filter logic.
- **Pagination**: offset-based, page size 50, hard cap 500 total rows fetched per request (simple bound, not virtualized infinite scroll — YAGNI given current data volume).
- **Component stays `ActivityLog.tsx`** (not renamed) — it's imported once, in `TeamView.tsx`; renaming the file for a display-label change is unrelated churn. The on-screen heading changes from "Activity" to "Audit Log".
- **No i18n** — `ActivityLog.tsx` is a widget-level component with existing hardcoded English strings (not routed through `t()`, unlike `DashboardClient.tsx`'s chrome). Staying consistent with its own existing convention, not `DashboardClient`'s.
- **Access**: unchanged — `requireRole(['owner', 'admin'])` at the route already matches `TeamView`'s tab-level gate. No RBAC changes needed.

**Tech stack:** existing Supabase accessor, Next.js route handler, SWR, Vitest.

---

### Task 1: `parseAuditLogQuery` — pure, testable query parser

**Files:**
- Create: `src/lib/auditLogQuery.ts`
- Test: `src/lib/auditLogQuery.test.ts`

- [ ] Step 1: Write failing tests: valid full param set parses correctly; invalid `action` (not in `create`/`update`/`delete`) returns a validation error; invalid `from`/`to` (unparseable date) returns an error; `to` before `from` returns an error; `limit` clamps to `[1, 500]`; defaults (`limit=50`, `offset=0`) apply when unset.
- [ ] Step 2: Run `npx vitest run src/lib/auditLogQuery.test.ts` — expect FAIL.
- [ ] Step 3: Implement `parseAuditLogQuery(searchParams: URLSearchParams): { ok: true; filters: AuditLogFilters } | { ok: false; error: string }` — pure, no I/O.
- [ ] Step 4: Run tests — expect PASS.
- [ ] Step 5: Commit: `feat(audit-log): add pure query parser for explorer filters`.

### Task 2: Extend `listAuditLog()` accessor

**Files:** Modify `src/lib/db/auditLog.ts`

- [ ] Step 1: Extend the filter param to `{ domain?, action?, actorEmail?, q?, from?, to?, limit?, offset? }`.
- [ ] Step 2: `actorEmail` → `.ilike('actor_email', \`%${actorEmail}%\`)`; `q` → `.or()` across `entity_type`/`entity_id` ilike; `from`/`to` → `.gte()`/`.lte()` on `created_at`; `limit`/`offset` → `.range(offset, offset + limit - 1)` replacing the hardcoded `.limit(100)`.
- [ ] Step 3: `npx tsc --noEmit` — PASS (no test here; matches existing no-DB-accessor-tests convention).

### Task 3: Extend `/api/audit-log` route + CSV export

**Files:** Modify `src/app/api/audit-log/route.ts`

- [ ] Step 1: Call `parseAuditLogQuery(req.nextUrl.searchParams)`; on `{ ok: false }` return `422` with the error.
- [ ] Step 2: On `format=csv`, build a CSV string (header row + one line per entry, quote-escaping commas/quotes in free-text fields) and return with `Content-Type: text/csv`, `Content-Disposition: attachment; filename="audit-log.csv"`.
- [ ] Step 3: Otherwise return the existing JSON shape, now paginated (`{ entries, totalCount }` instead of a bare array — **breaking response-shape change**, so Task 4's hook must update in the same commit).
- [ ] Step 4: `npx tsc --noEmit` — PASS.

### Task 4: Extend `useAuditLog` hook

**Files:** Modify `src/hooks/useAuditLog.ts`

- [ ] Step 1: Accept a filters object instead of a single `domain` string; build the query string from all params; adapt to the new `{ entries, totalCount }` response shape; expose `loadMore()` that bumps `offset`.

### Task 5: Extend `ActivityLog.tsx` UI

**Files:** Modify `src/components/dashboard/ActivityLog.tsx`

- [ ] Step 1: Add action-type `<select>`, actor-email text input, date-from/date-to inputs, free-text search input — all controlled state, debounced into the hook call.
- [ ] Step 2: Add "Load more" button (calls `loadMore()`, disabled when `entries.length >= totalCount`).
- [ ] Step 3: Add "Export CSV" button — builds the same filter query string with `format=csv` appended, triggers a `window.location` navigation (browser handles the `Content-Disposition` download; no client-side blob-building needed).
- [ ] Step 4: Change heading text from "Activity" to "Audit Log".

### Task 6: Verify + commit

- [ ] `npx tsc --noEmit` — PASS
- [ ] `npm test` — PASS (new `auditLogQuery.test.ts` included)
- [ ] `npm run lint` — no new errors vs. main's pre-existing baseline
- [ ] Commit, push `feat/audit-log-explorer`, open PR, verify CI, merge.
