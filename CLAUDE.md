# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Next.js version

This project runs **Next.js 16.2.9**, which has breaking changes from older versions in training data. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build (runs next build)
npm run lint     # ESLint
npm test         # runs vitest (unit tests only -- see coverage note below)
npx tsc --noEmit # type-check without emitting
```

A Vitest suite exists (`npm test`) but coverage is thin and targeted, not comprehensive — as of 2026-07-05 it covers `apiSecurity.ts`, `permissions.ts`, `portalAuth.ts`, `cseScope.ts`, and `algorithmicMatch.ts`. Most of the app (routes, components, db accessors) has no test coverage. Still run `npx tsc --noEmit` before committing; it catches far more than the test suite does today.

## Architecture

### Data layer — Supabase (Postgres)

All persistent data lives in Supabase Postgres (project "Lion Jobs Agency"), with Row Level Security enabled on every table. There is no ORM — routes call thin per-domain accessor modules directly.

- **`src/lib/supabase.ts`** — the Supabase client, initialised with `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server-side only; the service role key bypasses RLS, so it must never reach the client bundle).
- **`src/lib/db/*.ts`** — one accessor module per domain (`jobs`, `candidates`, `companies`, `leads`, `subscribers`, `feedback`, `contracts`, `interactions`, `cse`, `enterpriseStats`, `legalSettings`, `consents`, `invoices`, `staff`, `systemEvents`, `statsHistory`, `rolePermissions`), re-exported from **`src/lib/db/index.ts`**. API routes import from `@/lib/db`, never from an individual accessor file.
- **`src/lib/drive.ts`** — a separate, still-active integration: uploads candidate CVs to Google Drive via a Google service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_DRIVE_PARENT_FOLDER_ID`). This is unrelated to the old Sheets-based data layer — Drive only ever stored files, not structured data.
- **`src/lib/authOptions.ts`** — NextAuth Google OAuth login gate for `/dashboard`. Accepts anyone with an active row in the `staff` table; `ADMIN_EMAIL` is a permanent fallback that always works regardless of staff table state (see Access control section below).

The private key (`GOOGLE_PRIVATE_KEY`) is sanitised through `parsePrivateKey()` in `drive.ts`, which strips accidental surrounding quotes, converts `\n` escape sequences, and trims whitespace — handle it there, not in callers.

Schema changes live in `supabase/migrations/*.sql`, numbered in application order. **Read `supabase/MIGRATIONS.md` before writing or applying one.** The project is CLI-linked (`npx supabase link --project-ref gthewuhgrnnabyxkozvv`, authenticated via `SUPABASE_ACCESS_TOKEN` — browser login doesn't work in non-TTY sessions) and its migration history is reconciled with the live schema; run `supabase db push` to apply a new one, and `supabase migration list` to confirm it matches reality afterward.

> Historical note: this app originally ran on Google Sheets + a Make.com webhook (see `docs/superpowers/plans/2026-06-30-supabase-migration.md` for the migration). That data layer (`src/lib/sheets.ts`, `src/lib/makeWebhook.ts`) has been fully removed as of the migration — do not reintroduce it or assume it still exists.
>
> Content Studio (`ContentStudio.tsx`) generates copy-paste-ready post text for Facebook/Telegram/WhatsApp/LinkedIn; it has never had a working direct-distribution path. Its "Send to Make.com" button and the `/api/content/distribute` stub it referenced (unreachable — the button was always `disabled`) were removed 2026-07-06 (Layer 22) as confirmed dead code, along with the orphaned `cs_msg_sent`/`cs_msg_send_failed`/`cs_msg_network_error`/`cs_msg_dev_mode`/`cs_send_to_make`/`cs_sending` i18n keys that referenced the already-archived `MAKE_PUBLISH_WEBHOOK_URL`. New job listings still auto-publish to Telegram/Facebook on their own via the separate, live `publish-job` webhook (`.github/workflows/auto-post-job.yml`) — that path is unaffected.

### Request flow

```
Supabase Postgres (RLS enabled)
    ↓  (@supabase/supabase-js, service role key — server-side only)
src/lib/db/*.ts                                ← one accessor module per domain
    ↓
src/app/api/**/route.ts                        ← Next.js Route Handlers
    ↓  (fetch, cached via Cache-Control headers or SWR)
src/hooks/{useJobs,useCandidates,...}.ts       ← SWR hooks, client-side only
    ↓
React components
```

The public job board (homepage `/` and `/jobs`) uses real server-side query-pushdown pagination as of Phase 13: `useJobs.ts` calls `/api/jobs` with `limit`/`offset` plus filter params, and `getJobsPaginated()` (`src/lib/db/jobs.ts`) pushes keyword/category/type/location/salary filtering into the Supabase query itself — the browser is not filtering a full in-memory dataset for this flow. Dashboard views that need an effectively-complete list instead of a paginated one (`JobsPanel`'s management table, `AnalyticsOverview`'s stats) still fetch a large capped page (see `getJobsPaginated()`'s 1000-row ceiling) and filter client-side via `filterJobs()` in `useJobs.ts` — that part of the old client-filtering model is still accurate for those two call sites specifically.

### Pages and routing

| Route | Purpose |
|-------|---------|
| `/` | Homepage chooser — routes visitors to candidate or employer flow (Phase 11) |
| `/candidate` | Candidate-facing public job board (search, filter, apply) |
| `/company` | Employer-facing landing page / portal entry |
| `/candidate/portal` | Candidate magic-link portal — application tracking, status, documents (Sprint 2) |
| `/company/portal` | Company magic-link portal — job posting status, candidate shortlists (Sprint 2) |
| `/apply/[jobId]` | Candidate application form |
| `/jobs/[slug]` | Individual job listing page |
| `/companies/[slug]` | Public company profile page |
| `/drop-cv` | Drop CV / speculative application form |
| `/my-applications` | Candidate application tracker |
| `/resume-builder` | Resume builder tool |
| `/dashboard` | Internal admin console — 13 tabs: Overview, Candidates (Kanban + table), Post Job, Manage Jobs, Companies, Enterprise (CRM), B2B Leads, Content Studio, Email Campaigns, Legal, Billing, Team & Access, System Health |

### Access control — staff table, per-tab/per-action RBAC

`authOptions.ts`'s `signIn` callback accepts anyone with an active row in the `staff` table (`id`, `email`, `name`, `role`: `owner`/`admin`/`cse`/`viewer`, `active`), managed via the Team & Access dashboard tab. `ADMIN_EMAIL` is kept as a **permanent** fallback in `authOptions.ts` only — always works regardless of the staff table's state, so a missing/misconfigured row can never lock out the account this auth system originally belonged to. Every other file uses `requireStaff()` / `requireRole()` from `src/lib/auth.ts`, not `ADMIN_EMAIL` directly — `grep -rl ADMIN_EMAIL src/` should only ever match `authOptions.ts`, `auth.ts`, and explanatory comments in `proxy.ts`/`dashboard/page.tsx`.

Role is attached to the session/JWT at sign-in (`authOptions.ts`'s `jwt` callback) and does **not** update until that staff member's next login — changing someone's role in the Team & Access tab takes effect on their next sign-in, not immediately.

**Enforcement is per-tab/per-action RBAC, since Phase 4**: `requireTabAccess(domain, level)` in `src/lib/auth.ts` checks a hard-coded (role × tab) → access-level (`none`/`view`/`manage`) matrix in `src/lib/permissions.ts`, covering all 4 roles across all 13 dashboard tabs. `owner`/`admin` have full access everywhere; `cse` gets full access to Companies/Enterprise/B2B Leads plus view-only on Legal/Billing/Overview and no access to recruitment or marketing tabs; `viewer` is read-only everywhere except Post Job/Team. System Health (added Phase 5, after this RBAC model was built) follows the same row as Team & Access — `owner`/`admin` only, `cse` and `viewer` have no access. `/api/staff/*` still additionally requires `requireRole(['owner', 'admin'])` for managing the roster itself. **CSE row-level scoping (Phase 10, migration `0011`)**: `staff.cse_rep_id` links a `cse`-role login to a `cse_reps` row; `GET /api/companies`, `/api/contracts`, and `/api/interactions` filter server-side to that rep's accounts. Application-layer filtering only — the service-role Supabase client bypasses Postgres RLS entirely, so a RLS policy here would be silently ineffective. An unlinked `cse` (`cse_rep_id: NULL`) fails closed — sees an empty list, not everything. `b2b_leads` is explicitly not scoped: that table has no CSE-assignment concept in its data model (it's a shared pool). See `src/lib/cseScope.ts`.

### State management

No global state store. Filter state lives in `page.tsx` and is passed down as props. The hero search bar (`HeroSection`) receives an `onSearch` callback from `page.tsx` so its keyword and category inputs sync with the main `JobFilters` and `SearchBar` below the fold.

### Styling

Tailwind CSS v4 with a custom design-token layer in `src/app/globals.css`. Brand colour variables (`--brand-50` through `--brand-700`) map to `color-brand-*` utilities via `@theme inline`. Do not use arbitrary hex values inline — extend the token set in `globals.css` instead.

shadcn/ui primitives live in `src/components/ui/`. The project uses `@base-ui/react` and `class-variance-authority` under the hood.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | Project URL from Supabase dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key — bypasses RLS; server-side only, never expose to the client |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` | Yes | Service account for Google Drive CV storage (`src/lib/drive.ts`) — unrelated to Supabase |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | Yes | Drive folder under which per-candidate CV sub-folders are created |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth app for `/dashboard` admin login (NextAuth) |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | Yes | NextAuth config |
| `ADMIN_EMAIL` | Yes | Only this Google account may sign in to `/dashboard` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Yes | Transactional email + weekly digest / job-alert crons |
| `ADMIN_KEY` | Yes | Header-based auth for `POST/DELETE /api/jobs` |
| `CRON_SECRET` | Yes | Authenticates Vercel cron hits to `/api/cron/*` |
| `SENTRY_DSN` | No | Sentry project DSN for server-side exception capture (Phase 5). Unset = `Sentry.init` is a no-op, matching every other optional integration in this repo. |
| `ALERT_EMAIL` | No | Where Phase 6's health-check alerts (cron silence, failure-rate spikes) are sent. Unset = the check silently no-ops, matching every other optional integration in this repo. |
| `PORTAL_SESSION_SECRET` | Yes | HMAC-SHA256 key for signing candidate and company portal session tokens (magic-link auth, Sprint 2). Raw token is only ever in the emailed link; only the SHA-256 hash is stored in the DB. |
| `PUBLISH_WEBHOOK_SECRET` / `GITHUB_ACTIONS_TOKEN` / `GITHUB_REPO` / `SITE_URL` | Yes (prod) | Triggers the GitHub Actions workflow that posts new jobs to Telegram/Facebook |

`GOOGLE_SHEET_ID`, `GOOGLE_JOBS_TAB`, `GOOGLE_CANDIDATES_TAB`, `GOOGLE_COMPANIES_TAB`, `GOOGLE_FEEDBACK_TAB`, `MAKE_WEBHOOK_URL`, and `MAKE_PUBLISH_WEBHOOK_URL` are **archived** — leftover from the pre-Supabase data layer, no longer read by any code path. `GOOGLE_CANDIDATES_TAB`, `MAKE_WEBHOOK_URL`, and `MAKE_PUBLISH_WEBHOOK_URL` were deleted from Vercel Production on 2026-07-03; the rest were already absent. See `.env.example`'s archive section for historical reference only — do not re-add.

`MAKE_EMPLOYER_WEBHOOK_URL` and `MAKE_DRIVE_WEBHOOK_URL` were found live in Vercel (Production + Preview) during a 2026-07-03 audit but read by **no code path in `src/` or `.github/`** — unlike the vars above, they were never in `.env.example`'s archive list, so this was dead-on-arrival config from a planned-but-unbuilt feature rather than a migration leftover. Repo owner confirmed deletion; removed from Vercel the same day.

Copy `.env.example` to `.env.local` for local development.

## Deployment

Vercel's own native GitHub git integration deploys automatically on every push (preview for PRs, production for `main`) — this is dashboard-configured on Vercel's side, not driven by any file in this repo. `.github/workflows/deploy.yml` used to *also* run `vercel build && vercel deploy --prebuilt` itself; that was discovered to be a fully redundant second deployment of the same commit (confirmed directly: when that CLI step failed on Vercel's free-tier upload-API quota, production was still fully live and current, because the native git integration had already deployed the same commit through an unrelated path) and was removed 2026-07-04. `.github/workflows/deploy.yml`'s real job now is the quality gate — `npm test` + `npm audit` run as required status checks on every PR, which is what actually keeps bad code out of what Vercel deploys.

`VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` are no longer required by this workflow specifically (nothing in it calls the Vercel CLI anymore) — left as GitHub Secrets in case a future CLI-driven step is ever reintroduced, not deleted as part of this cleanup.

There are two separate GitHub Actions workflow files that both run on PRs — check `.github/workflows/` directly before adding or renaming a third: `ci.yml` (job `verify`: `next build` + `tsc --noEmit`) and `deploy.yml` (jobs `deploy-preview`/`deploy-production`, display name "Test & Audit": `npm test` + `npm audit`). They were briefly both named "CI" in the Actions UI after a 2026-07-04 cleanup renamed `deploy.yml`'s display name without checking for an existing collision — fixed same day. The job names (`deploy-preview`/`deploy-production`) in `deploy.yml` are historical from when it also deployed and are kept as-is so branch protection's required-status-checks (which match by job name, not workflow display name) don't silently break.

## Known but deliberately not installed: agent-tooling skill repos

Two Claude Code skill repos were evaluated (2026-07-02) and intentionally left uninstalled because they don't fit this project's domain:

- **`vercel-labs/skills`** — the `npx skills` installer CLI itself (not a skill in its own right). Used to install skills from other repos.
- **`google/agents-cli`** — teaches agents Google's Agent Development Kit (ADK): scaffolding, evals, deploying to Vertex AI, publishing to Gemini Enterprise. Irrelevant to this Next.js/Supabase job board.

If this project ever pivots toward building agent-based features (e.g. an AI agent product, not just AI-assisted CV scoring), revisit `google/agents-cli` via `npx skills add google/agents-cli`. Until then, do not add it or its dependencies.

**`collaborator-ai/collab-public`** (evaluated 2026-07-02) is a separate case: a native Electron desktop app for visually arranging terminal/agent sessions on an infinite canvas, not a Claude Code skill — it has no CLI/API/MCP surface, so there's nothing installable into this project or invocable by an agent. See `docs/skills/collaborator-multi-agent.md` for the full evaluation and human-operator install/usage instructions, should you want it as a personal terminal-management tool.

See `docs/skills/candidate-tools.md` for a broader reference list of external tools/repos surfaced 2026-07-06 (trading agents, scraping/browser automation, ads-audit, video/image generation, chat/companion agents) — verified to exist but none installed, wired up, or pre-approved for autonomous use; each needs its own relevance check and explicit go-ahead when a task actually calls for it.

- **`JuliusBrussee/caveman`** (evaluated 2026-07-06) — a general agent-output-style modifier ("caveman-speak") that compresses Claude's replies for token savings. Irrelevant to this job platform's domain, same as the two entries above. Additionally **not installed on principle**: its installer is a `curl | bash` / `irm | iex` remote-script pipe that applies **globally** across all Claude Code sessions on the machine (not scoped to this repo) and adds hooks that auto-enable on every session — a system-wide, hard-to-reverse change with unreviewed-remote-script risk. If revisited, review `install.sh`/`install.ps1` contents first and decide deliberately whether a global, cross-project behavior change is wanted at all — it's a different category of decision than a per-project dev-tooling skill.
