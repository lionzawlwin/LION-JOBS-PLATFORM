# Supabase Migration Design

**Date:** 2026-06-30  
**Author:** Lion Zawl Win (via Claude Code)  
**Status:** Approved — proceeding to implementation

---

## Overview

Migrate Lion Jobs Agency from Google Sheets (flat-file database) to Supabase PostgreSQL. Drop Make.com and the Telegram inbound bot entirely. Keep Google Drive for CV file storage (via existing `googleapis` service account). Fresh-start: Supabase begins clean; the historical Google Sheet becomes a read-only archive.

**Supabase project:** `Lion Jobs Agency` | `gthewuhgrnnabyxkozvv` | `ap-southeast-1`

---

## Decision Record

| Decision | Choice | Rationale |
|---|---|---|
| CV storage | Google Drive (keep) | Already integrated via `drive.ts`; no third-party tools |
| Migration strategy | Fresh start (Option A) | Sheets becomes read-only archive; clean schema |
| Code approach | Mirror facade (`db.ts` replaces `sheets.ts`) | Same function signatures → minimal route changes |
| Make.com | Dropped entirely | Replaced by direct Supabase + Drive API |
| Telegram inbound | Dropped entirely | Was never inbound; Telegram cron (outbound) kept |

---

## Architecture

```
Candidate submits → POST /api/apply
  │
  ├─ Google Drive API (drive.ts) → CV uploaded to Drive → driveUrl
  ├─ Supabase: INSERT candidates + applications (cv_url = driveUrl)
  └─ Return { ok: true }

Admin deletes candidate → DELETE /api/candidates/[id]
  │
  ├─ Fetch application.google_drive_cv_url from Supabase
  ├─ Extract Drive fileId from URL regex
  ├─ Drive API: files.delete(fileId)  [graceful: 404 → continue]
  └─ Supabase: DELETE candidates (CASCADE deletes applications)

Job board reads → GET /api/jobs → Supabase: SELECT jobs ORDER BY posted_at DESC
```

---

## Database Schema

### Enum Types

```sql
CREATE TYPE application_status AS ENUM ('Applied', 'Shortlisted', 'Interview', 'Hired');
CREATE TYPE company_status     AS ENUM ('Lead', 'Prospect', 'Client', 'Inactive');
CREATE TYPE lead_status        AS ENUM ('New', 'Contacted', 'Qualified', 'Converted', 'Closed');
```

### Tables

| Table | Primary Purpose | Key Columns |
|---|---|---|
| `jobs` | Public job listings | id, title, company, location, category, type, salary_min/max, requirements[], benefits[] |
| `candidates` | Person profile (one per person) | id, full_name, phone, email, profile fields |
| `applications` | Application to a job | candidate_id → candidates, job_id → jobs, stage, google_drive_cv_url |
| `companies` | B2B employer CRM | id, name, contact_person, email, status |
| `b2b_leads` | Employer hiring requests | id, company_name, job_title, work_email, urgency, status |
| `subscribers` | Email newsletter list | id, email UNIQUE, category |
| `feedback` | Interview feedback | id, candidate_id (soft), company, rating 1–5 |

### Notable Design Choices

- `requirements` and `benefits` are `text[]` arrays (replacing pipe/comma-separated strings in Sheets)
- `applications.candidate_id` FK has `ON DELETE CASCADE` — deleting a candidate auto-deletes their applications
- `applications.job_id` FK has `ON DELETE SET NULL` — deleting a job keeps the application history
- `applications.google_drive_cv_url` stores the Drive web-view URL for dual-deletion
- `feedback.candidate_id` is a soft reference (no FK) — feedback survives candidate deletion
- `touch_last_updated()` trigger auto-stamps `applications.last_updated` on every UPDATE

### Indexes

```sql
CREATE INDEX idx_jobs_category    ON jobs(category);
CREATE INDEX idx_jobs_posted_at   ON jobs(posted_at DESC);
CREATE INDEX idx_apps_candidate   ON applications(candidate_id);
CREATE INDEX idx_apps_stage       ON applications(stage);
CREATE INDEX idx_apps_applied_at  ON applications(applied_at DESC);
CREATE INDEX idx_leads_status     ON b2b_leads(status);
```

---

## Data Access Layer

### File Layout

```
src/lib/
  supabase.ts          ← singleton createClient (service role key)
  db/
    index.ts           ← barrel re-export (mirrors sheets.ts public API)
    jobs.ts            ← getJobs, appendJob, deleteJob
    candidates.ts      ← getCandidates, appendCandidate, updateCandidateStage,
                          updateCandidateJob, updateCandidateCvUrl, deleteCandidate,
                          getCandidatesByEmailOrPhone
                          deleteCandidateWithDriveFile  ← NEW (dual-deletion)
    companies.ts       ← getCompanies, appendCompany, updateCompanyStatus
    leads.ts           ← getB2bLeads, appendB2bLead, updateB2bLeadStatus, deleteB2bLead
    subscribers.ts     ← appendEmailSubscriber
    feedback.ts        ← appendFeedback, getCompanyFeedback
```

### Supabase Client (`src/lib/supabase.ts`)

```ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);
```

**Security:** `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never expose as `NEXT_PUBLIC_`.

---

## Files Changed

### Created
- `src/lib/supabase.ts`
- `src/lib/db/index.ts` + `jobs.ts` + `candidates.ts` + `companies.ts` + `leads.ts` + `subscribers.ts` + `feedback.ts`

### Updated (import swap: `@/lib/sheets` → `@/lib/db`)
- 20 API routes (all files matching `src/app/api/**/*.ts`)
- 5 page/sitemap files (`page.tsx`, `sitemap.ts`, `[slug]/page.tsx`)
- `src/app/api/apply/route.ts` — also removes Make.com `forwardToMake()` call
- `src/app/api/candidates/[id]/route.ts` — implements dual-deletion (Drive + Supabase)
- `src/app/api/employers/request/route.ts` — removes Make.com webhook fire
- `src/app/api/content/distribute/route.ts` — removes Make.com, returns 501
- `src/app/api/webhooks/publish-job/route.ts` — removes Make.com forward block; keeps GitHub Actions dispatch

### Deleted
- `src/lib/makeWebhook.ts`

### Updated (env vars)
- `.env.example` — adds `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; marks Sheets vars as archive-only

---

## Dual-Deletion Flow

```
DELETE /api/candidates/[id]
  1. Auth: session.user.email === ADMIN_EMAIL
  2. SELECT google_drive_cv_url FROM applications WHERE candidate_id = $1 LIMIT 1
  3. If cv_url matches /\/file\/d\/([a-zA-Z0-9_-]+)/:
       a. Drive API: files.delete(fileId)
       b. On 404: log warn + continue  (file already gone — not an error)
       c. On other error: log error + continue  (still delete DB row)
  4. DELETE FROM candidates WHERE id = $1  (CASCADE deletes applications)
  5. Return { ok: true, driveFileDeleted: boolean }
```

---

## Row Level Security

Service role key bypasses RLS by default. RLS is a second line of defence:

```sql
-- jobs: public read (job board), service-role-only write
CREATE POLICY "jobs_public_read" ON jobs FOR SELECT USING (true);

-- candidates + applications: no public access
CREATE POLICY "candidates_deny_anon" ON candidates   FOR ALL USING (false);
CREATE POLICY "apps_deny_anon"       ON applications FOR ALL USING (false);

-- companies, b2b_leads, subscribers: no public access
CREATE POLICY "companies_deny_anon" ON companies   FOR ALL USING (false);
CREATE POLICY "leads_deny_anon"     ON b2b_leads   FOR ALL USING (false);
CREATE POLICY "subs_deny_anon"      ON subscribers FOR ALL USING (false);

-- feedback: public insert + public read (anonymised ratings)
CREATE POLICY "feedback_public_insert" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "feedback_public_read"   ON feedback FOR SELECT USING (true);
```

---

## Environment Variables

### Add to Vercel + `.env.local`
```
SUPABASE_URL=https://gthewuhgrnnabyxkozvv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Settings → API → service_role>
```

### Keep (Drive still uses these)
```
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
GOOGLE_DRIVE_PARENT_FOLDER_ID
```

### Archive (no longer read by application code after migration)
```
GOOGLE_SHEET_ID
GOOGLE_JOBS_TAB / GOOGLE_CANDIDATES_TAB / ...
MAKE_WEBHOOK_URL / MAKE_PUBLISH_WEBHOOK_URL / MAKE_EMPLOYER_WEBHOOK_URL
```

---

## Implementation Order

1. Apply SQL schema to Supabase (`apply_migration`)
2. Install `@supabase/supabase-js`
3. Create `src/lib/supabase.ts`
4. Create `src/lib/db/` — all 7 files
5. Update 25 source files (import swap + logic changes)
6. Delete `src/lib/makeWebhook.ts`
7. Update `.env.example`
8. `npx tsc --noEmit` — zero errors
9. Commit + push to `main`
