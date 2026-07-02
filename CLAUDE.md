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

### Data layer — Google Sheets as the database

There is no SQL database or ORM. All persistent data lives in a Google Spreadsheet:

- **`src/lib/sheets.ts`** — all Sheets access. Uses `googleapis` with a service account. The spreadsheet has two tabs whose names default to `Jobs` and `Candidates` but are configurable via `GOOGLE_JOBS_TAB` / `GOOGLE_CANDIDATES_TAB` env vars.
- **`src/lib/makeWebhook.ts`** — forwards application submissions to a Make.com webhook (`MAKE_WEBHOOK_URL`).

`sheets.ts` exports three functions used by API routes: `getJobs`, `getCandidates`, `updateCandidateStage`. When env vars are missing, `isConfigured()` returns false and the functions return empty data rather than throwing.

The private key (`GOOGLE_PRIVATE_KEY`) is sanitised through `parsePrivateKey()` in `sheets.ts`, which strips accidental surrounding quotes, converts `\n` escape sequences, and trims whitespace — handle it there, not in callers.

### Request flow

```
Google Sheet
    ↓  (googleapis SDK, service account auth)
src/lib/sheets.ts
    ↓
src/app/api/{jobs,candidates,apply}/route.ts   ← Next.js Route Handlers
    ↓  (fetch, cached via Cache-Control headers or SWR)
src/hooks/{useJobs,useCandidates}.ts           ← SWR hooks, client-side only
    ↓
React components
```

All filtering happens **client-side** inside `filterJobs()` in `src/hooks/useJobs.ts` — the API returns the full dataset and the browser filters it. No server-side pagination exists.

### Pages and routing

| Route | Purpose |
|-------|---------|
| `/` | Public job board — hero, search, job grid |
| `/apply/[jobId]` | Candidate application form |
| `/dashboard` | Internal Kanban board for managing candidate stages |

### State management

No global state store. Filter state lives in `page.tsx` and is passed down as props. The hero search bar (`HeroSection`) receives an `onSearch` callback from `page.tsx` so its keyword and category inputs sync with the main `JobFilters` and `SearchBar` below the fold.

### Styling

Tailwind CSS v4 with a custom design-token layer in `src/app/globals.css`. Brand colour variables (`--brand-50` through `--brand-700`) map to `color-brand-*` utilities via `@theme inline`. Do not use arbitrary hex values inline — extend the token set in `globals.css` instead.

shadcn/ui primitives live in `src/components/ui/`. The project uses `@base-ui/react` and `class-variance-authority` under the hood.

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `GOOGLE_SHEET_ID` | Yes | Spreadsheet ID from the URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Service account email |
| `GOOGLE_PRIVATE_KEY` | Yes | Full PEM key — paste with real newlines in Vercel; use `\n` escapes in `.env.local` |
| `MAKE_WEBHOOK_URL` | Yes (prod) | Omitting it in dev causes `/api/apply` to return `{ok:true, dev:true}` |
| `GOOGLE_JOBS_TAB` | No | Sheet tab name, defaults to `Jobs` |
| `GOOGLE_CANDIDATES_TAB` | No | Sheet tab name, defaults to `Candidates` |

Copy `.env.example` to `.env.local` for local development.

## Deployment

Production deploys automatically on push to `main` via `.github/workflows/deploy.yml` using `vercel build --prod && vercel deploy --prebuilt --prod`. Pull requests get a preview deployment with the URL posted as a PR comment.

Required GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Known but deliberately not installed: agent-tooling skill repos

Two Claude Code skill repos were evaluated (2026-07-02) and intentionally left uninstalled because they don't fit this project's domain:

- **`vercel-labs/skills`** — the `npx skills` installer CLI itself (not a skill in its own right). Used to install skills from other repos.
- **`google/agents-cli`** — teaches agents Google's Agent Development Kit (ADK): scaffolding, evals, deploying to Vertex AI, publishing to Gemini Enterprise. Irrelevant to this Next.js/Supabase/Google-Sheets job board.

If this project ever pivots toward building agent-based features (e.g. an AI agent product, not just AI-assisted CV scoring), revisit `google/agents-cli` via `npx skills add google/agents-cli`. Until then, do not add it or its dependencies.

**`collaborator-ai/collab-public`** (evaluated 2026-07-02) is a separate case: a native Electron desktop app for visually arranging terminal/agent sessions on an infinite canvas, not a Claude Code skill — it has no CLI/API/MCP surface, so there's nothing installable into this project or invocable by an agent. See `docs/skills/collaborator-multi-agent.md` for the full evaluation and human-operator install/usage instructions, should you want it as a personal terminal-management tool.
