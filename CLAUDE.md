# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: Next.js version

This project runs **Next.js 16.2.9**, which has breaking changes from older versions in training data. Before writing any Next.js-specific code, read the relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build (runs next build)
npm run lint     # ESLint
npx tsc --noEmit # type-check without emitting (no test suite exists)
```

No test suite is configured. Use `npx tsc --noEmit` to catch type errors before committing.

## Architecture

### Data layer — Supabase (Postgres)

All persistent data lives in Supabase Postgres (project "Lion Jobs Agency"), with Row Level Security enabled on every table. There is no ORM — routes call thin per-domain accessor modules directly.

- **`src/lib/supabase.ts`** — the Supabase client, initialised with `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (server-side only; the service role key bypasses RLS, so it must never reach the client bundle).
- **`src/lib/db/*.ts`** — one accessor module per domain (`jobs`, `candidates`, `companies`, `leads`, `subscribers`, `feedback`, `contracts`, `interactions`, `cse`, `enterpriseStats`, `legalSettings`, `consents`, `invoices`), re-exported from **`src/lib/db/index.ts`**. API routes import from `@/lib/db`, never from an individual accessor file.
- **`src/lib/drive.ts`** — a separate, still-active integration: uploads candidate CVs to Google Drive via a Google service account (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_DRIVE_PARENT_FOLDER_ID`). This is unrelated to the old Sheets-based data layer — Drive only ever stored files, not structured data.
- **`src/lib/authOptions.ts`** — NextAuth Google OAuth login gate for `/dashboard`, restricted to a single `ADMIN_EMAIL`.

The private key (`GOOGLE_PRIVATE_KEY`) is sanitised through `parsePrivateKey()` in `drive.ts`, which strips accidental surrounding quotes, converts `\n` escape sequences, and trims whitespace — handle it there, not in callers.

Schema changes live in `supabase/migrations/*.sql`, numbered in application order. **Read `supabase/MIGRATIONS.md` before writing or applying one.** The project is CLI-linked (`npx supabase link --project-ref gthewuhgrnnabyxkozvv`, authenticated via `SUPABASE_ACCESS_TOKEN` — browser login doesn't work in non-TTY sessions) and its migration history is reconciled with the live schema; run `supabase db push` to apply a new one, and `supabase migration list` to confirm it matches reality afterward.

> Historical note: this app originally ran on Google Sheets + a Make.com webhook (see `docs/superpowers/plans/2026-06-30-supabase-migration.md` for the migration). That data layer (`src/lib/sheets.ts`, `src/lib/makeWebhook.ts`) has been fully removed as of the migration — do not reintroduce it or assume it still exists. Content Studio's "Send to Make.com" button is a **separate, unrelated, and currently unfinished** feature (`/api/content/distribute` is a stub returning 501) — it is not a remnant of the old data layer.

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

All filtering happens **client-side** inside `filterJobs()` in `src/hooks/useJobs.ts` — the API returns the full dataset and the browser filters it. No server-side pagination exists.

### Pages and routing

| Route | Purpose |
|-------|---------|
| `/` | Public job board — hero, search, job grid |
| `/apply/[jobId]` | Candidate application form |
| `/dashboard` | Internal admin console — 12 tabs: Overview, Candidates (Kanban + table), Post Job, Manage Jobs, Companies, Enterprise (CRM), B2B Leads, Content Studio, Email Campaigns, Legal, Billing, Team & Access |

### Access control — single admin gate, staff table not yet wired in

`/dashboard` is still gated entirely by `authOptions.ts` checking `session.user.email === ADMIN_EMAIL` (one hardcoded address), and so is every mutating API route — `grep -rl ADMIN_EMAIL src/` turns up 33 files, each with its own inline `=== ADMIN_EMAIL` check, not a shared helper.

A `staff` table exists (`id`, `email`, `name`, `role`: `owner`/`admin`/`cse`/`viewer`, `active`) with a Team & Access tab to manage it, but **it does not yet control who can log in or do anything** — it's a roster in preparation. Widening `signIn` in `authOptions.ts` to check `staff` instead of `ADMIN_EMAIL` before those 33 routes are migrated to the same check would let a newly added staff member log into a dashboard where almost every tab immediately 401s. See `supabase/MIGRATIONS.md` for the migration itself; the login-gate + route-migration follow-up is intentionally not done yet.

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
| `PUBLISH_WEBHOOK_SECRET` / `GITHUB_ACTIONS_TOKEN` / `GITHUB_REPO` / `SITE_URL` | Yes (prod) | Triggers the GitHub Actions workflow that posts new jobs to Telegram/Facebook |

`GOOGLE_SHEET_ID`, `GOOGLE_JOBS_TAB`, `GOOGLE_CANDIDATES_TAB`, `MAKE_WEBHOOK_URL`, and `MAKE_PUBLISH_WEBHOOK_URL` are **archived** — leftover from the pre-Supabase data layer, no longer read by any code path. Safe to delete from Vercel env; see `.env.example`'s archive section.

Copy `.env.example` to `.env.local` for local development.

## Deployment

Production deploys automatically on push to `main` via `.github/workflows/deploy.yml` using `vercel build --prod && vercel deploy --prebuilt --prod`. Pull requests get a preview deployment with the URL posted as a PR comment.

Required GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Known but deliberately not installed: agent-tooling skill repos

Two Claude Code skill repos were evaluated (2026-07-02) and intentionally left uninstalled because they don't fit this project's domain:

- **`vercel-labs/skills`** — the `npx skills` installer CLI itself (not a skill in its own right). Used to install skills from other repos.
- **`google/agents-cli`** — teaches agents Google's Agent Development Kit (ADK): scaffolding, evals, deploying to Vertex AI, publishing to Gemini Enterprise. Irrelevant to this Next.js/Supabase job board.

If this project ever pivots toward building agent-based features (e.g. an AI agent product, not just AI-assisted CV scoring), revisit `google/agents-cli` via `npx skills add google/agents-cli`. Until then, do not add it or its dependencies.

**`collaborator-ai/collab-public`** (evaluated 2026-07-02) is a separate case: a native Electron desktop app for visually arranging terminal/agent sessions on an infinite canvas, not a Claude Code skill — it has no CLI/API/MCP surface, so there's nothing installable into this project or invocable by an agent. See `docs/skills/collaborator-multi-agent.md` for the full evaluation and human-operator install/usage instructions, should you want it as a personal terminal-management tool.
