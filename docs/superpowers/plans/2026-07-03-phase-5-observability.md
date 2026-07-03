# Phase 5: Sentry + System Health Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **No test suite exists in this repo.** Every task's steps are **Implement → Type-check → Commit**, matching the process already used for Billing, Legal, and Phase 4 RBAC (see `PROGRESS.md`).

**Goal:** Wire Sentry exception capture into every route that currently only `console.error`s (or has no error handling at all), and add an Owner/Admin-only "System Health" dashboard tab backed by a new `system_events` Supabase table, per `docs/superpowers/specs/2026-07-03-phase-5-observability-design.md`.

**Architecture:** `src/instrumentation.ts` catches genuinely unhandled exceptions automatically via Next.js's `onRequestError` hook. `src/lib/observability.ts`'s `logFailure()` is the one function every already-handled `catch` block calls instead of `console.error` — it both reports to Sentry and writes a row to the new `system_events` table. The dashboard tab reads that table directly (no live Sentry API dependency).

**Tech Stack:** `@sentry/nextjs`, Supabase (new table + accessor module), Next.js 16 Route Handlers, existing `requireTabAccess()` from Phase 4.

---

## File Structure

**Create:**
- `src/instrumentation.ts` — Sentry init + `onRequestError`
- `src/lib/observability.ts` — `logFailure()`
- `src/lib/db/systemEvents.ts` — accessor for the new table
- `src/app/api/system-events/route.ts` — `GET`, gated `requireTabAccess('system-health', 'view')`
- `src/components/dashboard/SystemHealthView.tsx` — the tab UI
- `supabase/migrations/0007_add_system_events.sql`

**Modify:**
- `src/types/index.ts` — add `FailureCategory`, `SystemEvent`, `CronStatus`
- `src/lib/db/index.ts` — export the new accessor
- `src/lib/permissions.ts` — add `'system-health'` to `TabDomain` + matrix
- `src/components/dashboard/DashboardClient.tsx` — add the tab
- `src/lib/i18n.ts` — new tab label/banner keys, `en` + `my`
- `.env.example`, `CLAUDE.md` — document `SENTRY_DSN`
- `supabase/MIGRATIONS.md` — add the `0007` row
- 21 existing route files — swap `console.error` for `logFailure()` (2 more, the cron routes, get logging added where none existed)

---

### Task 1: Install Sentry, store the DSN

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `.env.local` (not committed)
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Install `@sentry/nextjs`**

Run: `npm install @sentry/nextjs`

- [ ] **Step 2: Add the DSN to `.env.local`**

Append this line to `.env.local` (create the file if it doesn't already have it — do not touch any other line in the file):

```
SENTRY_DSN=https://603bc1b35057c0f0ae8ff4e23a44a1b1@o4511501249150976.ingest.us.sentry.io/4511669364064256
```

- [ ] **Step 3: Document the var in `.env.example` (no value — this file is committed)**

Add this line to `.env.example`, in a sensible place near the other integration credentials (not in the archived section):

```
SENTRY_DSN=
```

- [ ] **Step 4: Add a row to `CLAUDE.md`'s "Environment variables" table**

In `CLAUDE.md`, find the markdown table under `## Environment variables` (rows like `| \`ADMIN_KEY\` | Yes | ... |`). Add a new row right after the `CRON_SECRET` row:

```markdown
| `SENTRY_DSN` | Yes | Sentry project DSN for server-side exception capture (Phase 5). Unset = `Sentry.init` is a no-op, matching every other optional integration in this repo. |
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (nothing imports Sentry yet, this just confirms the install didn't break anything).

- [ ] **Step 6: Commit**

`.env.local` is gitignored and must NOT be committed. Commit only the tracked files:

```bash
git add package.json package-lock.json .env.example CLAUDE.md
git commit -m "chore: install @sentry/nextjs, document SENTRY_DSN"
```

---

### Task 2: `system_events` migration

**Files:**
- Create: `supabase/migrations/0007_add_system_events.sql`
- Modify: `supabase/MIGRATIONS.md`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0007_add_system_events.sql`:

```sql
-- Phase 5: local record of failures + cron heartbeats for the System
-- Health dashboard tab. Sentry (see src/lib/observability.ts) is the
-- source of truth for full exception detail; this table exists so the
-- dashboard doesn't depend on a live Sentry API call at page-load time.

CREATE TABLE IF NOT EXISTS system_events (
  id         TEXT PRIMARY KEY,
  category   TEXT NOT NULL CHECK (category IN ('webhook', 'ai_scoring', 'invoicing', 'cron', 'other')),
  level      TEXT NOT NULL DEFAULT 'error' CHECK (level IN ('error', 'info')),
  route      TEXT NOT NULL,
  message    TEXT NOT NULL,
  context    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Apply it**

Run: `npx supabase migration list` first to confirm local/remote agree up through `0006`, then:

Run: `npx supabase db push`
Expected: output confirms `0007_add_system_events.sql` applied.

- [ ] **Step 3: Verify against the live project**

Confirm the table exists with `rls_enabled: true` — use the Supabase MCP `list_tables` tool if connected in this session, or `npx supabase migration list` to confirm local/remote now agree through `0007`.

- [ ] **Step 4: Update `supabase/MIGRATIONS.md`**

Add a row to the numbering table:

```markdown
| `0007_add_system_events.sql` | 2026-07-03 | `system_events` table (Phase 5 observability) |
```

And update the "next migration is" line to say `0008`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0007_add_system_events.sql supabase/MIGRATIONS.md
git commit -m "feat(db): add system_events table for Phase 5 observability"
```

---

### Task 3: Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Append new types**

Add to the end of `src/types/index.ts`:

```ts
export type FailureCategory = 'webhook' | 'ai_scoring' | 'invoicing' | 'cron' | 'other';
export type EventLevel = 'error' | 'info';

export interface SystemEvent {
  id: string;
  category: FailureCategory;
  level: EventLevel;
  route: string;
  message: string;
  context: Record<string, string | number | boolean | null> | null;
  createdAt: string;
}

export interface CronStatus {
  route: string;
  lastRunAt: string;
  ok: boolean;
  message: string;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add SystemEvent, FailureCategory, CronStatus"
```

---

### Task 4: `system_events` DB accessor

**Files:**
- Create: `src/lib/db/systemEvents.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Write the accessor**

Create `src/lib/db/systemEvents.ts`:

```ts
import { supabase } from '@/lib/supabase';
import type { SystemEvent, FailureCategory, EventLevel, CronStatus } from '@/types';

function mapToSystemEvent(row: Record<string, unknown>): SystemEvent {
  return {
    id:        row.id as string,
    category:  row.category as FailureCategory,
    level:     row.level as EventLevel,
    route:     row.route as string,
    message:   row.message as string,
    context:   (row.context as SystemEvent['context']) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function appendSystemEvent(data: {
  category: FailureCategory;
  level?:   EventLevel;
  route:    string;
  message:  string;
  context?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const { error } = await supabase.from('system_events').insert({
    id,
    category: data.category,
    level:    data.level ?? 'error',
    route:    data.route,
    message:  data.message,
    context:  data.context ?? null,
  });

  if (error) console.error('[db/systemEvents] appendSystemEvent failed:', error.message);
}

export async function listSystemEvents(filters: {
  category?: FailureCategory;
  days?:     number;
}): Promise<SystemEvent[]> {
  let query = supabase
    .from('system_events')
    .select('*')
    .eq('level', 'error')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filters.category) query = query.eq('category', filters.category);
  if (filters.days) {
    const since = new Date(Date.now() - filters.days * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[db/systemEvents] listSystemEvents failed:', error.message);
    return [];
  }
  return (data ?? []).map(mapToSystemEvent);
}

const CRON_ROUTES = ['/api/cron/job-alerts', '/api/cron/weekly-email'];

export async function getCronStatus(): Promise<CronStatus[]> {
  const results = await Promise.all(
    CRON_ROUTES.map(async (route): Promise<CronStatus | null> => {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .eq('category', 'cron')
        .eq('route', route)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;
      return {
        route,
        lastRunAt: data.created_at as string,
        ok:        data.level === 'info',
        message:   data.message as string,
      };
    }),
  );
  return results.filter((r): r is CronStatus => r !== null);
}
```

Note: `appendSystemEvent` deliberately never throws — a failure to log a failure must not itself break the caller. This mirrors `logFailure()`'s own no-throw contract from Task 6.

- [ ] **Step 2: Export it**

In `src/lib/db/index.ts`, add a new line:

```ts
export * from './systemEvents';
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/systemEvents.ts src/lib/db/index.ts
git commit -m "feat(db): add system_events accessor (append, list, cron status)"
```

---

### Task 5: `src/instrumentation.ts`

**Files:**
- Create: `src/instrumentation.ts`

- [ ] **Step 1: Write it**

```ts
import * as Sentry from '@sentry/nextjs';

export function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
  });
}

export const onRequestError = Sentry.captureRequestError;
```

- [ ] **Step 2: Verify `Sentry.captureRequestError` actually exists in the installed package**

Run: `grep -r "captureRequestError" node_modules/@sentry/nextjs/build/types/*.d.ts node_modules/@sentry/nextjs/types/*.d.ts 2>/dev/null | head -5`

Expected: at least one match confirming this export exists in the installed version. If it does NOT exist (e.g. the installed version renamed or removed it), STOP and report BLOCKED with what you actually found exported from `@sentry/nextjs`'s top-level types — do not guess an alternative API name.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add src/instrumentation.ts
git commit -m "feat(observability): add Sentry init + onRequestError instrumentation hook"
```

---

### Task 6: `src/lib/observability.ts`

**Files:**
- Create: `src/lib/observability.ts`

- [ ] **Step 1: Write it**

```ts
import * as Sentry from '@sentry/nextjs';
import { appendSystemEvent } from '@/lib/db';
import type { FailureCategory } from '@/types';

// The single call site every route uses instead of console.error for a
// handled-but-notable failure. Never throws — reporting a failure must
// never itself become a new failure for the caller. See
// docs/superpowers/specs/2026-07-03-phase-5-observability-design.md for
// the PII/secrets rule governing `context`.
export async function logFailure(input: {
  category: FailureCategory;
  route:    string;
  message:  string;
  error?:   unknown;
  context?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  try {
    Sentry.captureException(input.error ?? new Error(input.message), {
      tags:  { category: input.category, route: input.route },
      extra: input.context,
    });
  } catch {
    // Sentry itself failing to accept the event must not block the DB write below.
  }

  await appendSystemEvent({
    category: input.category,
    route:    input.route,
    message:  input.message,
    context:  input.context,
  });
}

// Cron routes call this on every run, success or failure, so "last run
// time" is always answerable — see getCronStatus() in
// src/lib/db/systemEvents.ts.
export async function logCronSuccess(route: string, message: string): Promise<void> {
  await appendSystemEvent({ category: 'cron', level: 'info', route, message });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/observability.ts
git commit -m "feat(observability): add logFailure() and logCronSuccess()"
```

---

### Task 7: Cron routes

**Files:**
- Modify: `src/app/api/cron/job-alerts/route.ts`
- Modify: `src/app/api/cron/weekly-email/route.ts`

Both currently have gaps (see spec's "Current state"). This task adds the missing handling from scratch, not a simple swap.

- [ ] **Step 1: `job-alerts` — wrap the body, log failure and success**

Replace `src/app/api/cron/job-alerts/route.ts` in full:

```ts
import { NextResponse } from 'next/server';
import { getJobs } from '@/lib/db';
import { logFailure, logCronSuccess } from '@/lib/observability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';
const ROUTE = '/api/cron/job-alerts';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const jobs = await getJobs();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const newJobs = jobs.filter((job) => {
      if (!job.postedAt) return false;
      try {
        return new Date(job.postedAt) >= since;
      } catch {
        return false;
      }
    });

    if (newJobs.length === 0) {
      await logCronSuccess(ROUTE, 'No new jobs in last 24 hours');
      return NextResponse.json({ ok: true, sent: 0, message: 'No new jobs in last 24 hours' });
    }

    const botToken  = process.env.TELEGRAM_BOT_TOKEN;
    const channelId = process.env.TELEGRAM_CHANNEL_ID;

    if (!botToken || !channelId) {
      await logCronSuccess(ROUTE, 'Telegram not configured, skipped');
      return NextResponse.json({ ok: true, sent: 0, message: 'Telegram not configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID' });
    }

    const preview = newJobs.slice(0, 5);
    const more    = newJobs.length > 5 ? `\n\n…and ${newJobs.length - 5} more roles` : '';

    const lines = preview.map(
      (job) =>
        `▶️ *${escapeMarkdown(job.title)}*\n   ${escapeMarkdown(job.company)} · ${escapeMarkdown(job.location)}\n   ${SITE_URL}/apply/${job.id}`,
    );

    const message =
      `🦁 *Lion Jobs — Daily Digest*\n\n` +
      `${newJobs.length} new ${newJobs.length === 1 ? 'role' : 'roles'} posted today!\n\n` +
      lines.join('\n\n') +
      more +
      `\n\n[Browse all jobs](${SITE_URL})`;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: 'Markdown',
          disable_web_page_preview: false,
        }),
      },
    );

    const tgData: unknown = await tgRes.json();
    const tgOk = (tgData as { ok?: boolean }).ok ?? false;

    if (!tgOk) {
      await logFailure({
        category: 'cron',
        route:    ROUTE,
        message:  'Telegram sendMessage returned ok:false',
        context:  { sentCount: newJobs.length, telegramStatus: tgRes.status },
      });
    } else {
      await logCronSuccess(ROUTE, `Sent ${newJobs.length} new jobs`);
    }

    return NextResponse.json({ ok: true, sent: newJobs.length, telegram: tgOk });
  } catch (err) {
    await logFailure({ category: 'cron', route: ROUTE, message: (err as Error).message, error: err });
    return NextResponse.json({ error: 'job-alerts cron failed' }, { status: 502 });
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()])/g, '\\$1');
}
```

- [ ] **Step 2: `weekly-email` — same treatment**

Replace `src/app/api/cron/weekly-email/route.ts` in full:

```ts
import { getCompanies, getJobs, getCandidates } from '@/lib/db';
import { Resend } from 'resend';
import { buildWeeklyDigestEmail } from '@/lib/emailTemplates';
import { logFailure, logCronSuccess } from '@/lib/observability';
import type { NextRequest } from 'next/server';
import { formatSalary } from '@/lib/utils';

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Lion Jobs Agency <noreply@lionjobs.co>';
const ROUTE = '/api/cron/weekly-email';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      await logCronSuccess(ROUTE, 'RESEND_API_KEY not set, skipped');
      return Response.json({ ok: true, skipped: true, reason: 'RESEND_API_KEY not set' });
    }

    const [companies, jobs, candidates] = await Promise.all([
      getCompanies(),
      getJobs(),
      getCandidates(),
    ]);

    const targets = companies.filter(
      (c) => c.status !== 'Inactive' && c.email,
    );

    if (targets.length === 0) {
      await logCronSuccess(ROUTE, 'No active companies with email');
      return Response.json({ ok: true, sent: 0, reason: 'No active companies with email' });
    }

    const jobBriefs = jobs.slice(0, 6).map((j) => ({
      title:    j.title,
      company:  j.company,
      location: j.location,
      salary:   j.salaryMin > 0 ? formatSalary(j.salaryMin, j.salaryMax, j.currency) : 'Negotiable',
      id:       j.id,
    }));

    const resend = new Resend(resendKey);
    let sent = 0;
    const errors: string[] = [];

    for (const company of targets) {
      try {
        const email = buildWeeklyDigestEmail({
          contactPerson:  company.contactPerson || company.name,
          companyName:    company.name,
          jobs:           jobBriefs,
          candidateCount: candidates.length,
        });
        await resend.emails.send({
          from:    FROM,
          to:      [company.email],
          subject: email.subject,
          html:    email.html,
        });
        sent++;
      } catch (err) {
        errors.push(`${company.name}: ${(err as Error).message}`);
      }
    }

    if (errors.length > 0) {
      await logFailure({
        category: 'cron',
        route:    ROUTE,
        message:  `${errors.length}/${targets.length} recipient sends failed`,
        context:  { sent, total: targets.length, failed: errors.length },
      });
    } else {
      await logCronSuccess(ROUTE, `Sent ${sent}/${targets.length}`);
    }

    return Response.json({ ok: true, sent, total: targets.length, errors });
  } catch (err) {
    await logFailure({ category: 'cron', route: ROUTE, message: (err as Error).message, error: err });
    return Response.json({ error: 'weekly-email cron failed' }, { status: 502 });
  }
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron
git commit -m "feat(cron): add logFailure/logCronSuccess to job-alerts and weekly-email"
```

---

### Task 8: Webhook + AI scoring (simple, single call site each)

**Files:**
- Modify: `src/app/api/webhooks/publish-job/route.ts`
- Modify: `src/app/api/analyze-cv/route.ts`

- [ ] **Step 1: `webhooks/publish-job`**

Add the import `import { logFailure } from '@/lib/observability';` near the top of the file (with the other `@/lib/*` imports). Replace:

```ts
  if (res.ok) {
    console.log('[publish-job] GitHub Actions dispatch sent successfully');
  } else {
    const body = await res.text().catch(() => '');
    console.error(`[publish-job] GitHub Actions dispatch failed: ${res.status} — ${body}`);
  }
```

with:

```ts
  if (res.ok) {
    console.log('[publish-job] GitHub Actions dispatch sent successfully');
  } else {
    const body = await res.text().catch(() => '');
    await logFailure({
      category: 'webhook',
      route:    '/api/webhooks/publish-job',
      message:  `GitHub Actions dispatch failed: ${res.status}`,
      context:  { status: res.status, bodySnippet: body.slice(0, 200) },
    });
  }
```

Also replace the fire-and-forget catch at the bottom:

```ts
  triggerGitHubActions(payload).catch((err) =>
    console.error('[publish-job] GitHub Actions trigger error:', err),
  );
```

with:

```ts
  triggerGitHubActions(payload).catch((err) =>
    logFailure({
      category: 'webhook',
      route:    '/api/webhooks/publish-job',
      message:  'GitHub Actions trigger error',
      error:    err,
    }),
  );
```

- [ ] **Step 2: `analyze-cv`**

Add the import `import { logFailure } from '@/lib/observability';`. Replace:

```ts
    } catch (err) {
      errors.push(`${candidate.id}: ${(err as Error).message}`);
    }
```

with:

```ts
    } catch (err) {
      const msg = `${candidate.id}: ${(err as Error).message}`;
      errors.push(msg);
      await logFailure({
        category: 'ai_scoring',
        route:    '/api/analyze-cv',
        message:  msg,
        error:    err,
        context:  { applicationId: candidate.id },
      });
    }
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhooks src/app/api/analyze-cv
git commit -m "feat(observability): wire logFailure into webhook and AI-scoring routes"
```

---

### Task 9: `apply` route (3 call sites, 2 categories)

**Files:**
- Modify: `src/app/api/apply/route.ts`

This file has three separate `console.error` sites in three different concerns — handle each individually, don't collapse them.

- [ ] **Step 1: Add the import**

Add `import { logFailure } from '@/lib/observability';` near the top.

- [ ] **Step 2: Database insert failure (category `other`)**

Replace:

```ts
  } catch (err) {
    console.error('[apply] CRITICAL — database insert failed:', err);
    console.error('[apply] Candidate data that failed to save:', {
      fullName, email, phone, position, jobId,
    });
    return Response.json(
      { error: 'Could not save your application. Please try again or contact us directly.' },
      { status: 502 },
    );
  }
```

with:

```ts
  } catch (err) {
    await logFailure({
      category: 'other',
      route:    '/api/apply',
      message:  'CRITICAL — database insert failed',
      error:    err,
      context:  { position, hasJobId: Boolean(jobId) },
    });
    return Response.json(
      { error: 'Could not save your application. Please try again or contact us directly.' },
      { status: 502 },
    );
  }
```

(Note: `fullName`/`email`/`phone` are deliberately dropped from `context` — those are exactly the PII the design spec's hard rule prohibits. `position` and whether a job was linked are safe.)

- [ ] **Step 3: Drive upload failure (category `other`)**

Replace:

```ts
      } catch (err) {
        // Non-fatal — database row already exists
        console.error('[apply] Drive upload error (non-critical — DB write succeeded):', err);
      }
```

with:

```ts
      } catch (err) {
        // Non-fatal — database row already exists
        await logFailure({
          category: 'other',
          route:    '/api/apply',
          message:  'Drive upload error (non-critical — DB write succeeded)',
          error:    err,
          context:  { applicationId: applicationId ?? null },
        });
      }
```

- [ ] **Step 4: AI scoring failure (category `ai_scoring`)**

Replace:

```ts
      } catch (err) {
        console.error('[apply] AI scoring error (non-critical):', err);
      }
```

with:

```ts
      } catch (err) {
        await logFailure({
          category: 'ai_scoring',
          route:    '/api/apply',
          message:  'AI scoring error (non-critical)',
          error:    err,
          context:  { applicationId: applicationId ?? null },
        });
      }
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/apply
git commit -m "feat(observability): wire logFailure into apply route's 3 failure sites"
```

---

### Task 10: Invoicing domain

**Files:**
- Modify: `src/app/api/invoices/route.ts`
- Modify: `src/app/api/invoices/[id]/route.ts`
- Modify: `src/app/api/candidates/[id]/final-salary/route.ts`

- [ ] **Step 1: `invoices/route.ts`**

Add `import { logFailure } from '@/lib/observability';`. Replace:

```ts
  } catch (err) {
    console.error('[invoices/post]', err);
    return Response.json({ error: 'Could not create invoice.' }, { status: 502 });
  }
```

with:

```ts
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/invoices',
      message:  'Could not create invoice',
      error:    err,
      context:  { applicationId, companyId },
    });
    return Response.json({ error: 'Could not create invoice.' }, { status: 502 });
  }
```

- [ ] **Step 2: `invoices/[id]/route.ts`**

Add the import. Replace:

```ts
  } catch (err) {
    console.error('[invoices/[id]/patch]', err);
    return Response.json({ error: 'Could not update invoice status.' }, { status: 502 });
  }
```

with:

```ts
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/invoices/[id]',
      message:  'Could not update invoice status',
      error:    err,
      context:  { invoiceId: id },
    });
    return Response.json({ error: 'Could not update invoice status.' }, { status: 502 });
  }
```

- [ ] **Step 3: `candidates/[id]/final-salary/route.ts`**

Add the import. Replace:

```ts
  } catch (err) {
    console.error('[final-salary/patch]', err);
    return Response.json({ error: 'Could not update final agreed salary.' }, { status: 502 });
  }
```

with:

```ts
  } catch (err) {
    await logFailure({
      category: 'invoicing',
      route:    '/api/candidates/[id]/final-salary',
      message:  'Could not update final agreed salary',
      error:    err,
      context:  { applicationId: id },
    });
    return Response.json({ error: 'Could not update final agreed salary.' }, { status: 502 });
  }
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invoices src/app/api/candidates/[id]/final-salary
git commit -m "feat(observability): wire logFailure into invoicing domain routes"
```

---

### Task 11: Candidates "other" routes (7 files, includes the `stage` auth fix)

**Files:**
- Modify: `src/app/api/candidates/route.ts`
- Modify: `src/app/api/candidates/[id]/route.ts`
- Modify: `src/app/api/candidates/[id]/job/route.ts`
- Modify: `src/app/api/candidates/[id]/cv-url/route.ts`
- Modify: `src/app/api/candidates/[id]/interview/route.ts`
- Modify: `src/app/api/candidates/[id]/consent/route.ts`
- Modify: `src/app/api/candidates/[id]/stage/route.ts`

For every file below, the pattern is: add `import { logFailure } from '@/lib/observability';`, then replace the specific `console.error(...)` line shown with the `logFailure(...)` call shown, keeping every other line (including the `return` statement) exactly as-is.

- [ ] **Step 1: `candidates/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[/api/candidates]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates', message: 'Failed to load candidates', error: err });
```

- [ ] **Step 2: `candidates/[id]/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[candidates/delete]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]', message: 'Could not delete candidate', error: err, context: { applicationId: id } });
```

- [ ] **Step 3: `candidates/[id]/job/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[candidates/job] error:', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/job', message: 'Could not update job link', error: err, context: { applicationId: id } });
```

- [ ] **Step 4: `candidates/[id]/cv-url/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[cv-url/patch]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/cv-url', message: 'Could not update CV URL', error: err, context: { applicationId: id } });
```

- [ ] **Step 5: `candidates/[id]/interview/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[interview/patch]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/interview', message: 'Could not update interview details', error: err, context: { applicationId: id } });
```

- [ ] **Step 6: `candidates/[id]/consent/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[candidates/consent/post]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/consent', message: 'Could not record consent', error: err, context: { applicationId: id } });
```

(This is the public `POST` handler's catch block — do not add any auth check to this handler, only swap this one logging line, per Phase 4's explicit decision to keep it public.)

- [ ] **Step 7: `candidates/[id]/stage/route.ts` — logging fix AND the auth fix**

This file needs two changes. First, add two imports at the top:

```ts
import { requireTabAccess } from '@/lib/auth';
import { logFailure } from '@/lib/observability';
```

Second, add the auth guard as the first line of the `PATCH` function body (this route had `requireStaff()` at no point in its history — it's the gap identified during Phase 5's investigation, described in the design spec):

```ts
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('candidates', 'manage'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
```

Third, replace:
```ts
  } catch (err) {
    console.error('[stage] error:', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/candidates/[id]/stage', message: 'Could not update stage', error: err, context: { applicationId: id } });
```

- [ ] **Step 8: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/api/candidates
git commit -m "feat(observability): wire logFailure into candidates routes; fix missing auth on stage route"
```

---

### Task 12: Remaining "other" routes (9 files)

**Files:**
- Modify: `src/app/api/download/route.ts`
- Modify: `src/app/api/email/send/route.ts`
- Modify: `src/app/api/employers/request/route.ts`
- Modify: `src/app/api/jobs/route.ts`
- Modify: `src/app/api/jobs/[id]/route.ts`
- Modify: `src/app/api/leads/[id]/route.ts`
- Modify: `src/app/api/leads/[id]/status/route.ts`
- Modify: `src/app/api/legal/settings/route.ts`
- Modify: `src/app/api/subscribe/route.ts`

Same pattern as Task 11: add the `logFailure` import, replace the named `console.error` line.

- [ ] **Step 1: `download/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[download proxy]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/download', message: 'Failed to fetch remote file', error: err });
```

- [ ] **Step 2: `email/send/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[email] Resend error:', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/email/send', message: 'Resend error', error: err, context: { emailType: type } });
```

- [ ] **Step 3: `employers/request/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[employers/request] DB error:', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/employers/request', message: 'DB error saving lead', error: err });
```

- [ ] **Step 4: `jobs/route.ts`**

Replace:
```ts
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/jobs] DB write failed:', msg);
```
with:
```ts
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logFailure({ category: 'other', route: '/api/jobs', message: `DB write failed: ${msg}`, error: err });
```

- [ ] **Step 5: `jobs/[id]/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[DELETE /api/jobs/[id]]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/jobs/[id]', message: 'Failed to delete job', error: err, context: { jobId: id } });
```

- [ ] **Step 6: `leads/[id]/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[leads/delete]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/leads/[id]', message: 'Could not delete lead', error: err, context: { leadId: id } });
```

- [ ] **Step 7: `leads/[id]/status/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[leads/status] error:', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/leads/[id]/status', message: 'Could not update lead status', error: err, context: { leadId: id } });
```

- [ ] **Step 8: `legal/settings/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[legal/settings/patch]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/legal/settings', message: 'Could not update agency settings', error: err });
```

- [ ] **Step 9: `subscribe/route.ts`**

Replace:
```ts
  } catch (err) {
    console.error('[api/subscribe]', err);
```
with:
```ts
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/subscribe', message: 'Subscription failed', error: err });
```

- [ ] **Step 10: Add `import { logFailure } from '@/lib/observability';` to all 9 files**

Every file above needs this import added near its other `@/lib/*` imports — do this for all 9 now if you haven't already per-file.

- [ ] **Step 11: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 12: Commit**

```bash
git add src/app/api/download src/app/api/email src/app/api/employers src/app/api/jobs src/app/api/leads src/app/api/legal src/app/api/subscribe
git commit -m "feat(observability): wire logFailure into remaining console.error call sites"
```

---

### Task 13: Verify no `console.error` remains uninstrumented in scope

**Files:** none (verification only)

- [ ] **Step 1: Confirm every originally-identified site is migrated**

Run: `grep -rln "console\.error" src/app/api`

Expected: **empty output**. If anything remains, it means a site from the original 21-file list (or the `apply.ts` file's 3 sites) was missed in Tasks 8–12 — go back and fix it, don't leave it for a later task.

- [ ] **Step 2: Confirm `logFailure` is actually used everywhere it should be**

Run: `grep -rl "logFailure" src/app/api | wc -l`

Expected: at least 20 (candidates domain alone is 7 files, plus invoicing 3, plus webhook/ai_scoring 2, plus apply 1, plus the 9 "remaining other" files = 22 files using it at minimum; cron routes use `logFailure`/`logCronSuccess` too).

- [ ] **Step 3: Commit nothing — this is a read-only checkpoint**

If everything passes, proceed to Task 14. If not, fix the gap with a new commit before continuing.

---

### Task 14: `'system-health'` permissions domain

**Files:**
- Modify: `src/lib/permissions.ts`

- [ ] **Step 1: Add the domain to `TabDomain`**

Change:
```ts
export type TabDomain =
  | 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies'
  | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal'
  | 'billing' | 'team';
```
to:
```ts
export type TabDomain =
  | 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies'
  | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal'
  | 'billing' | 'team' | 'system-health';
```

- [ ] **Step 2: Add the matrix row to all four roles**

In each of the four role objects in `PERMISSIONS`, add `'system-health': '<level>'` as the last key, matching `team`'s pattern exactly:

```ts
  owner: {
    // ...existing keys unchanged...
    team: 'manage', 'system-health': 'manage',
  },
  admin: {
    // ...existing keys unchanged...
    team: 'manage', 'system-health': 'manage',
  },
  cse: {
    // ...existing keys unchanged...
    team: 'none', 'system-health': 'none',
  },
  viewer: {
    // ...existing keys unchanged...
    team: 'none', 'system-health': 'none',
  },
```

(i.e. change each role's `team: '...',` line to `team: '...', 'system-health': '...',` — same value as `team` in every case, since this tab should be exactly as restricted as Team & Access.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` — expect no errors. (If you missed adding `'system-health'` to any of the four role objects, this will fail with a TS error about a missing property, since `PERMISSIONS` is typed `Record<StaffRole, Record<TabDomain, AccessLevel>>`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat(auth): add system-health tab domain, gated same as team (owner/admin only)"
```

---

### Task 15: `GET /api/system-events`

**Files:**
- Create: `src/app/api/system-events/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { requireTabAccess } from '@/lib/auth';
import { listSystemEvents, getCronStatus } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { FailureCategory } from '@/types';

const VALID_CATEGORIES: FailureCategory[] = ['webhook', 'ai_scoring', 'invoicing', 'cron', 'other'];

export async function GET(req: NextRequest) {
  if (!(await requireTabAccess('system-health', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const categoryParam = sp.get('category') ?? undefined;
  const daysParam     = sp.get('days') ?? undefined;

  if (categoryParam && !VALID_CATEGORIES.includes(categoryParam as FailureCategory)) {
    return Response.json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}` }, { status: 422 });
  }

  const days = daysParam ? Number(daysParam) : 7;
  if (!Number.isFinite(days) || days <= 0) {
    return Response.json({ error: 'days must be a positive number' }, { status: 422 });
  }

  const [events, cronStatus] = await Promise.all([
    listSystemEvents({ category: categoryParam as FailureCategory | undefined, days }),
    getCronStatus(),
  ]);

  return Response.json({ events, cronStatus }, { headers: { 'Cache-Control': 'no-store' } });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/system-events
git commit -m "feat(api): add GET /api/system-events route"
```

---

### Task 16: `SystemHealthView.tsx`

**Files:**
- Create: `src/components/dashboard/SystemHealthView.tsx`

- [ ] **Step 1: Write the component, following `BillingView.tsx`'s exact pattern (self-contained fetch + local state, no separate hook file — this codebase doesn't use a hook for Billing either)**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ShieldCheck, ShieldAlert, RefreshCw } from 'lucide-react';
import type { SystemEvent, CronStatus, FailureCategory } from '@/types';

const CATEGORIES: FailureCategory[] = ['webhook', 'ai_scoring', 'invoicing', 'cron', 'other'];

const CATEGORY_LABELS: Record<FailureCategory, string> = {
  webhook:    'Webhook',
  ai_scoring: 'AI Scoring',
  invoicing:  'Invoicing',
  cron:       'Cron',
  other:      'Other',
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function SystemHealthView() {
  const [events, setEvents]         = useState<SystemEvent[]>([]);
  const [cronStatus, setCronStatus] = useState<CronStatus[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<FailureCategory | ''>('');
  const [days, setDays]             = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await fetch(`/api/system-events?${params.toString()}`);
      if (!res.ok) {
        setError(true);
        return;
      }
      const data = await res.json();
      setEvents(data.events ?? []);
      setCronStatus(data.cronStatus ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, days]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">Cron Job Status</h3>
        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cronStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground">No cron runs recorded yet.</p>
        ) : (
          cronStatus.map((c) => (
            <div key={c.route} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              {c.ok
                ? <ShieldCheck size={20} className="shrink-0 text-emerald-600" />
                : <ShieldAlert size={20} className="shrink-0 text-red-600" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{c.route}</p>
                <p className="text-xs text-muted-foreground truncate">{c.message}</p>
                <p className="text-xs text-muted-foreground">{fmtDateTime(c.lastRunAt)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <h3 className="text-sm font-bold text-foreground">Recent Failures</h3>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as FailureCategory | '')}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle size={36} className="text-red-500/60" />
          <p className="text-sm text-muted-foreground">Couldn&apos;t load system events. Please try again.</p>
          <button
            onClick={() => load()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ShieldCheck size={36} className="text-emerald-500/40" />
          <p className="text-sm text-muted-foreground">No failures in this range.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="p-3">Category</th>
                <th className="p-3">Route</th>
                <th className="p-3">Message</th>
                <th className="p-3">When</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id} className="border-b border-border/50">
                  <td className="p-3">
                    <span className="rounded-full bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
                      {CATEGORY_LABELS[ev.category]}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{ev.route}</td>
                  <td className="p-3 text-muted-foreground">{ev.message}</td>
                  <td className="p-3 text-muted-foreground">{fmtDateTime(ev.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` — expect no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/SystemHealthView.tsx
git commit -m "feat(dashboard): add SystemHealthView (cron status + recent failures)"
```

---

### Task 17: Wire the tab into `DashboardClient.tsx` + i18n

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add i18n keys**

In `src/lib/i18n.ts`, in the `en` object, add these two lines right after the existing `admin_tab_team`/`admin_banner_team` lines:

```ts
    admin_tab_system_health:     'System Health',
```
(next to `admin_tab_team`, in the tab-labels group)
```ts
    admin_banner_system_health:     ' Recent failures and cron job status. Visible to Owner and Admin only.',
```
(next to `admin_banner_team`, in the banners group)

In the `my` object, add the matching keys at the same relative position (next to `admin_tab_team`/`admin_banner_team` there):

```ts
    admin_tab_system_health:     'စနစ် ကျန်းမာရေး',
```
```ts
    admin_banner_system_health:     ' လတ်တလော မအောင်မြင်မှုများနှင့် cron အလုပ်အခြေအနေ။ ပိုင်ရှင်နှင့် အက်ဒမင်သာ ကြည့်ရှုနိုင်သည်။',
```

- [ ] **Step 2: Wire the tab into `DashboardClient.tsx`**

Add the import for the new component and an icon:

```tsx
import { SystemHealthView } from './SystemHealthView';
```

Add `Activity` to the existing `lucide-react` import line (alongside `BarChart2, Building2, ...`).

In `ALL_TABS`, add a new entry after the `team` entry:

```tsx
    { value: 'team',       label: t('admin_tab_team'),       icon: <UserCog     size={14} /> },
    { value: 'system-health', label: t('admin_tab_system_health'), icon: <Activity size={14} /> },
```

In the banner conditionals, add after the `team` line:

```tsx
          {activeTab === 'team'        && t('admin_banner_team')}
          {activeTab === 'system-health' && t('admin_banner_system_health')}
```

In the tab content render section, add after the `team` render line:

```tsx
      {activeTab === 'team'        && <TeamView />}
      {activeTab === 'system-health' && <SystemHealthView />}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit` — expect no errors. (`TabDomain` now includes `'system-health'`, so every `activeTab === '...'` comparison and the `Tab` type alias should accept this new literal without any other change needed — Task 14 already extended the shared type.)

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/DashboardClient.tsx src/lib/i18n.ts
git commit -m "feat(dashboard): wire System Health tab into DashboardClient, add i18n keys"
```

---

### Task 18: Final verification, PROGRESS.md, push

**Files:** none new — verification + `PROGRESS.md`

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit` — expect clean.

- [ ] **Step 2: Confirm zero remaining bare `console.error` in `src/app/api`**

Run: `grep -rln "console\.error" src/app/api`
Expected: empty.

- [ ] **Step 3: Confirm the `system-health` domain is symmetric with `team`**

Run: `grep -A1 "'system-health':" src/lib/permissions.ts`
Expected: 4 matches (one per role), each identical in value to that role's `team` entry.

- [ ] **Step 4: Confirm the migration is live**

Run: `npx supabase migration list` — confirm local/remote agree through `0007`.

- [ ] **Step 5: Update `PROGRESS.md`**

Append a new section (below the existing Phase 4 section, don't modify anything above it):

```markdown

---

# Phase 5: Sentry + System Health — Progress

Spec: `docs/superpowers/specs/2026-07-03-phase-5-observability-design.md`
Plan: `docs/superpowers/plans/2026-07-03-phase-5-observability.md`
Process: superpowers:subagent-driven-development (fresh subagent per task, spec review then code-quality review)
Branch: `feat/phase-5-observability` (not yet merged — PR opened for human review)

| Task | Description | Status |
|------|--------------|--------|
| 1 | Install @sentry/nextjs, store SENTRY_DSN | ✅ Done |
| 2 | system_events migration (0007) | ✅ Done |
| 3 | Types (SystemEvent, FailureCategory, CronStatus) | ✅ Done |
| 4 | system_events DB accessor | ✅ Done |
| 5 | src/instrumentation.ts | ✅ Done |
| 6 | src/lib/observability.ts (logFailure) | ✅ Done |
| 7 | Cron routes (job-alerts, weekly-email) | ✅ Done |
| 8 | Webhook + AI scoring routes | ✅ Done |
| 9 | apply route (3 call sites) | ✅ Done |
| 10 | Invoicing domain | ✅ Done |
| 11 | Candidates "other" routes + stage auth fix | ✅ Done |
| 12 | Remaining "other" routes | ✅ Done |
| 13 | Coverage verification | ✅ Done |
| 14 | system-health permissions domain | ✅ Done |
| 15 | GET /api/system-events | ✅ Done |
| 16 | SystemHealthView.tsx | ✅ Done |
| 17 | Wire tab + i18n | ✅ Done |
| 18 | Final verification | ✅ Done |

## Log

- 2026-07-03: Built Sentry capture (via `src/instrumentation.ts`'s `onRequestError` for truly unhandled exceptions, plus explicit `logFailure()` calls at every already-handled `catch` block) and a local `system_events` Supabase table so the System Health dashboard tab doesn't depend on a live Sentry API call.
- 2026-07-03: While migrating the candidates domain's console.error call sites, found `PATCH /api/candidates/[id]/stage` had never had an auth check at all — not a Phase 4 migration gap (nothing to migrate, it simply lacked `requireStaff()` from day one). Fixed by adding `requireTabAccess('candidates', 'manage')`, same as every other candidate-mutating route.
- 2026-07-03: `apply.ts`'s AI-scoring catch block is categorized `ai_scoring` (not `other`) since it's the same CV-scoring code path as `/api/analyze-cv` — both now report to the same category.
- 2026-07-03: Explicitly out of scope, per your instructions: alerting/notifications (Phase 6), Sentry performance tracing/session replay/source-map upload, any change to Phase 4's `requireTabAccess()`/`hasAccess()` enforcement code itself (only its data — the permissions matrix — gained a new `system-health` row).
- 2026-07-03: Could not verify Sentry events actually arrive at sentry.io from this environment (no outbound network verification available here) — recommend confirming from the Sentry project dashboard after deploy. Could not exercise the System Health tab live in a browser (OAuth-gated dashboard, same limitation as every prior phase).
```

- [ ] **Step 6: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: record Phase 5 observability completion in PROGRESS.md"
```

- [ ] **Step 7: Push the branch**

```bash
git push -u origin feat/phase-5-observability
```

Report the compare URL back (same limitation as Phase 4: `gh` is not installed in this environment, so the PR itself must be opened manually) — **do not merge**.

---

## Self-Review Notes

**Spec coverage:** every architecture section (instrumentation.ts, observability.ts, system_events table, System Health tab, route→category mapping including the `apply.ts` refinement and the `stage` auth-gap fix) has a corresponding task. Non-goals (alerting, tracing/replay/source-maps, touching Phase 4's enforcement code) are respected — no task does any of them.

**Type consistency:** `FailureCategory`/`SystemEvent`/`CronStatus` defined once in Task 3, imported unchanged in Tasks 4, 6, 15, 16. `TabDomain`'s `'system-health'` addition in Task 14 is the only place that type changes; Tasks 15–17 consume it, none redefine it.

**No placeholders:** every step shows exact before/after code for the specific line(s) being changed, not a description of what to do.
