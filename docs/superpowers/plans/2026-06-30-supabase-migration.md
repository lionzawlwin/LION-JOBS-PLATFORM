# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Google Sheets as the primary database with Supabase PostgreSQL, drop Make.com entirely, keep Google Drive for CV storage, and implement dual-deletion (DB row + Drive file) on candidate delete.

**Architecture:** Mirror-facade pattern — `src/lib/db/` exports identical function signatures to `sheets.ts` so all 25 files that import from `@/lib/sheets` need only a one-line import change. The Supabase client singleton lives in `src/lib/supabase.ts`. The complex logic (dual-deletion, apply flow without Make.com) is concentrated in `db/candidates.ts` and the updated `apply/route.ts`.

**Tech Stack:** `@supabase/supabase-js`, Supabase PostgreSQL (project `gthewuhgrnnabyxkozvv`), existing `googleapis` for Google Drive, Next.js 16 App Router, TypeScript, Zod

---

## File Map

### Created
| File | Responsibility |
|---|---|
| `src/lib/supabase.ts` | Service-role Supabase client singleton |
| `src/lib/db/index.ts` | Barrel re-export (public API matching `sheets.ts`) |
| `src/lib/db/jobs.ts` | `getJobs`, `appendJob`, `deleteJob` |
| `src/lib/db/candidates.ts` | All candidate ops + dual-deletion |
| `src/lib/db/companies.ts` | `getCompanies`, `appendCompany`, `updateCompanyStatus` |
| `src/lib/db/leads.ts` | `getB2bLeads`, `appendB2bLead`, `updateB2bLeadStatus`, `deleteB2bLead` |
| `src/lib/db/subscribers.ts` | `appendEmailSubscriber` |
| `src/lib/db/feedback.ts` | `appendFeedback`, `getCompanyFeedback` |

### Deleted
- `src/lib/makeWebhook.ts`

### Updated (import swap only — `@/lib/sheets` → `@/lib/db`)
- `src/app/api/candidates/route.ts`
- `src/app/api/candidates/[id]/stage/route.ts`
- `src/app/api/candidates/[id]/job/route.ts`
- `src/app/api/candidates/[id]/cv-url/route.ts`
- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/[id]/route.ts`
- `src/app/api/companies/route.ts`
- `src/app/api/companies/[id]/route.ts`
- `src/app/api/leads/route.ts`
- `src/app/api/leads/[id]/route.ts`
- `src/app/api/leads/[id]/status/route.ts`
- `src/app/api/subscribe/route.ts`
- `src/app/api/feedback/route.ts`
- `src/app/api/cron/job-alerts/route.ts`
- `src/app/api/cron/weekly-email/route.ts`
- `src/app/page.tsx`
- `src/app/sitemap.ts`
- `src/app/apply/[jobId]/page.tsx`
- `src/app/jobs/[slug]/page.tsx`
- `src/app/companies/[slug]/page.tsx`

### Updated (logic changes + import swap)
- `src/app/api/apply/route.ts` — removes `forwardToMake()`; cv_url written in INSERT not separate step
- `src/app/api/apply/status/route.ts` — import swap + `getCandidatesByEmailOrPhone`
- `src/app/api/candidates/[id]/route.ts` — dual-deletion (Drive file + DB row)
- `src/app/api/employers/request/route.ts` — removes Make.com webhook fire
- `src/app/api/content/distribute/route.ts` — removes Make.com, returns 501
- `src/app/api/webhooks/publish-job/route.ts` — import swap; removes Make.com forward block

### Updated (config)
- `.env.example`

---

## Task 1: Apply Supabase SQL Schema

**Files:** (no local files — applies to remote Supabase project via MCP)

- [ ] **Step 1.1: Apply SQL migration**

Use Supabase MCP `apply_migration` with project `gthewuhgrnnabyxkozvv`:

```sql
-- Enum types
CREATE TYPE application_status AS ENUM ('Applied', 'Shortlisted', 'Interview', 'Hired');
CREATE TYPE company_status     AS ENUM ('Lead', 'Prospect', 'Client', 'Inactive');
CREATE TYPE lead_status        AS ENUM ('New', 'Contacted', 'Qualified', 'Converted', 'Closed');

-- jobs
CREATE TABLE jobs (
  id            text PRIMARY KEY,
  title         text NOT NULL,
  company       text NOT NULL,
  location      text NOT NULL,
  category      text NOT NULL DEFAULT 'Other',
  type          text NOT NULL DEFAULT 'Full-time',
  salary_min    integer NOT NULL DEFAULT 0,
  salary_max    integer NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'MMK',
  description   text NOT NULL DEFAULT '',
  requirements  text[] DEFAULT '{}',
  benefits      text[] DEFAULT '{}',
  is_urgent     boolean DEFAULT false,
  is_featured   boolean DEFAULT false,
  posted_at     timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

-- candidates
CREATE TABLE candidates (
  id                text PRIMARY KEY,
  full_name         text NOT NULL,
  email             text,
  phone             text NOT NULL,
  city_location     text,
  education         text,
  experience_years  text,
  current_company   text,
  current_salary    text,
  languages         text,
  skills            text,
  portfolio_url     text,
  source            text DEFAULT 'Website',
  created_at        timestamptz DEFAULT now()
);

-- applications
CREATE TABLE applications (
  id                    text PRIMARY KEY,
  candidate_id          text NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  job_id                text REFERENCES jobs(id) ON DELETE SET NULL,
  job_title             text NOT NULL,
  company               text,
  stage                 application_status NOT NULL DEFAULT 'Applied',
  applied_at            timestamptz DEFAULT now(),
  stage_updated_at      timestamptz DEFAULT now(),
  assigned_to           text,
  interview_date        timestamptz,
  interview_location    text,
  salary_expected       text,
  salary_offered        text,
  notice_period         text,
  rating                smallint CHECK (rating >= 1 AND rating <= 5),
  google_drive_cv_url   text,
  linkedin_url          text,
  offer_date            date,
  start_date            date,
  notes                 text,
  last_updated          timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION touch_last_updated()
RETURNS TRIGGER AS $$ BEGIN NEW.last_updated = now(); RETURN NEW; END; $$
LANGUAGE plpgsql;

CREATE TRIGGER trg_applications_last_updated
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION touch_last_updated();

-- companies
CREATE TABLE companies (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  contact_person  text,
  email           text,
  phone           text,
  industry        text,
  city            text,
  status          company_status DEFAULT 'Lead',
  notes           text,
  last_contacted  timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- b2b_leads
CREATE TABLE b2b_leads (
  id              text PRIMARY KEY,
  company_name    text NOT NULL,
  industry        text,
  location        text,
  website         text,
  contact_name    text NOT NULL,
  contact_title   text,
  work_email      text NOT NULL,
  phone           text NOT NULL,
  job_title       text NOT NULL,
  headcount       text,
  work_setup      text,
  salary_budget   text,
  urgency         text,
  requirements    text,
  agency_message  text,
  job_description text,
  benefits        text,
  status          lead_status DEFAULT 'New',
  submitted_at    timestamptz DEFAULT now()
);

-- subscribers
CREATE TABLE subscribers (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  category      text DEFAULT 'All',
  subscribed_at timestamptz DEFAULT now(),
  source        text DEFAULT 'Website',
  ip            text
);

-- feedback
CREATE TABLE feedback (
  id                text PRIMARY KEY,
  candidate_id      text,
  company           text NOT NULL,
  job_title         text,
  rating            smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  experience        text NOT NULL,
  would_recommend   boolean DEFAULT false,
  submitted_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jobs_category    ON jobs(category);
CREATE INDEX idx_jobs_posted_at   ON jobs(posted_at DESC);
CREATE INDEX idx_apps_candidate   ON applications(candidate_id);
CREATE INDEX idx_apps_stage       ON applications(stage);
CREATE INDEX idx_apps_applied_at  ON applications(applied_at DESC);
CREATE INDEX idx_leads_status     ON b2b_leads(status);

-- RLS
ALTER TABLE jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_leads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_public_read"       ON jobs       FOR SELECT USING (true);
CREATE POLICY "candidates_deny_anon"   ON candidates   FOR ALL USING (false);
CREATE POLICY "apps_deny_anon"         ON applications FOR ALL USING (false);
CREATE POLICY "companies_deny_anon"    ON companies    FOR ALL USING (false);
CREATE POLICY "leads_deny_anon"        ON b2b_leads    FOR ALL USING (false);
CREATE POLICY "subs_deny_anon"         ON subscribers  FOR ALL USING (false);
CREATE POLICY "feedback_public_insert" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "feedback_public_read"   ON feedback FOR SELECT USING (true);
```

- [ ] **Step 1.2: Verify tables exist**

Use Supabase MCP `list_tables` and confirm 7 tables visible.

---

## Task 2: Install Package + Create Supabase Client

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/lib/supabase.ts`

- [ ] **Step 2.1: Install @supabase/supabase-js**

```bash
cd lion-jobs-platform && npm install @supabase/supabase-js
```

- [ ] **Step 2.2: Create `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.warn('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — DB calls will fail.');
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: { persistSession: false },
});
```

- [ ] **Step 2.3: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors (supabase.ts imports are valid).

---

## Task 3: Create `src/lib/db/jobs.ts`

**Files:** Create: `src/lib/db/jobs.ts`

- [ ] **Step 3.1: Write `src/lib/db/jobs.ts`**

```ts
import { supabase } from '@/lib/supabase';
import { cache } from 'react';
import type { Job } from '@/types';

export const getJobs = cache(async function getJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('posted_at', { ascending: false });

  if (error) {
    console.error('[db/jobs] getJobs error:', error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id:           r.id,
    title:        r.title,
    company:      r.company,
    location:     r.location,
    category:     r.category as Job['category'],
    type:         r.type as Job['type'],
    salaryMin:    r.salary_min,
    salaryMax:    r.salary_max,
    currency:     r.currency,
    description:  r.description,
    requirements: r.requirements ?? [],
    benefits:     r.benefits ?? [],
    postedAt:     r.posted_at,
    isUrgent:     r.is_urgent ?? false,
    isFeatured:   r.is_featured ?? false,
    applicationsCount: 0,
  }));
});

export async function appendJob(data: {
  title: string; company: string; location: string;
  category: string; type: string;
  salaryMin: number; salaryMax: number; currency: string;
  description: string; requirements: string[];
  isUrgent: boolean; isFeatured: boolean; benefits?: string[];
}): Promise<string> {
  const id = `jb-${Date.now()}`;

  const { error } = await supabase.from('jobs').insert({
    id,
    title:        data.title,
    company:      data.company,
    location:     data.location,
    category:     data.category,
    type:         data.type,
    salary_min:   data.salaryMin,
    salary_max:   data.salaryMax,
    currency:     data.currency,
    description:  data.description,
    requirements: data.requirements,
    benefits:     data.benefits ?? [],
    is_urgent:    data.isUrgent,
    is_featured:  data.isFeatured,
  });

  if (error) throw new Error(`appendJob failed: ${error.message}`);
  return id;
}

export async function deleteJob(jobId: string): Promise<void> {
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  if (error) throw new Error(`deleteJob failed: ${error.message}`);
}
```

---

## Task 4: Create `src/lib/db/candidates.ts`

**Files:** Create: `src/lib/db/candidates.ts`

This is the most complex module. It contains dual-deletion logic.

- [ ] **Step 4.1: Write `src/lib/db/candidates.ts`**

```ts
import { supabase } from '@/lib/supabase';
import { google } from 'googleapis';
import type { Candidate, ApplicationStatus } from '@/types';

function parsePrivateKey(raw: string): string {
  return raw.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').trim();
}

function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY
    ? parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY)
    : undefined;
  if (!email || !key) return null;
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return google.drive({ version: 'v3', auth });
}

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

const VALID_STAGES = new Set<ApplicationStatus>(['Applied', 'Shortlisted', 'Interview', 'Hired']);

export async function getCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select(`
      id, full_name, email, phone, city_location, education,
      experience_years, current_company, current_salary, languages,
      skills, portfolio_url, source, created_at,
      applications (
        id, job_id, job_title, company, stage, applied_at,
        stage_updated_at, salary_expected, interview_date,
        notes, google_drive_cv_url, linkedin_url, rating
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[db/candidates] getCandidates error:', error.message);
    return [];
  }

  return (data ?? []).flatMap((c) => {
    const apps = (c.applications as Record<string, unknown>[]) ?? [];
    if (apps.length === 0) {
      return [{
        id:          c.id,
        name:        c.full_name,
        email:       c.email ?? undefined,
        phone:       c.phone,
        position:    '',
        stage:       'Applied' as ApplicationStatus,
        appliedAt:   c.created_at,
        matchScore:  0,
        source:      c.source ?? undefined,
        cityLocation: c.city_location ?? undefined,
        education:    c.education ?? undefined,
        experienceYears: c.experience_years ?? undefined,
        currentCompany: c.current_company ?? undefined,
        currentSalary: c.current_salary ?? undefined,
        languages:   c.languages ?? undefined,
        skills:      c.skills ?? undefined,
        portfolioUrl: c.portfolio_url ?? undefined,
      }];
    }
    return apps.map((app) => ({
      id:             c.id,
      name:           c.full_name,
      email:          c.email ?? undefined,
      phone:          c.phone,
      position:       String(app.job_title ?? ''),
      jobId:          String(app.job_id ?? '') || undefined,
      company:        String(app.company ?? '') || undefined,
      cvUrl:          String(app.google_drive_cv_url ?? '') || undefined,
      linkedinUrl:    String(app.linkedin_url ?? '') || undefined,
      matchScore:     Number(app.rating) || 0,
      stage:          (VALID_STAGES.has(app.stage as ApplicationStatus)
        ? app.stage : 'Applied') as ApplicationStatus,
      appliedAt:      String(app.applied_at ?? c.created_at),
      notes:          String(app.notes ?? '') || undefined,
      salaryExpected: String(app.salary_expected ?? '') || undefined,
      interviewDate:  String(app.interview_date ?? '') || undefined,
      source:         c.source ?? undefined,
      cityLocation:   c.city_location ?? undefined,
      education:      c.education ?? undefined,
      experienceYears: c.experience_years ?? undefined,
      currentCompany: c.current_company ?? undefined,
      currentSalary:  c.current_salary ?? undefined,
      languages:      c.languages ?? undefined,
      skills:         c.skills ?? undefined,
      portfolioUrl:   c.portfolio_url ?? undefined,
    }));
  });
}

export async function appendCandidate(data: {
  fullName: string; email?: string; phone: string;
  position: string; jobId?: string; linkedinUrl?: string;
  cvFileName?: string; expectedSalary?: string; noticePeriod?: string;
  notes?: string; cityLocation?: string; education?: string;
  experienceYears?: string; currentCompany?: string; currentSalary?: string;
  languages?: string; skills?: string; portfolioUrl?: string;
}): Promise<string> {
  const candidateId = `cand-${Date.now()}`;
  const appId       = `app-${Date.now()}`;

  const { error: cErr } = await supabase.from('candidates').insert({
    id:               candidateId,
    full_name:        data.fullName,
    email:            data.email ?? null,
    phone:            data.phone,
    city_location:    data.cityLocation ?? null,
    education:        data.education ?? null,
    experience_years: data.experienceYears ?? null,
    current_company:  data.currentCompany ?? null,
    current_salary:   data.currentSalary ?? null,
    languages:        data.languages ?? null,
    skills:           data.skills ?? null,
    portfolio_url:    data.portfolioUrl ?? null,
    source:           'Website',
  });
  if (cErr) throw new Error(`appendCandidate (candidates): ${cErr.message}`);

  const notesParts = [
    data.cvFileName ? `CV: ${data.cvFileName}` : '',
    data.notes ?? '',
  ].filter(Boolean);

  const { error: aErr } = await supabase.from('applications').insert({
    id:             appId,
    candidate_id:   candidateId,
    job_id:         data.jobId ?? null,
    job_title:      data.position,
    stage:          'Applied',
    linkedin_url:   data.linkedinUrl ?? null,
    salary_expected: data.expectedSalary ?? null,
    notice_period:  data.noticePeriod ?? null,
    notes:          notesParts.join(' | ') || null,
  });
  if (aErr) throw new Error(`appendCandidate (applications): ${aErr.message}`);

  return candidateId;
}

export async function updateCandidateCvUrl(candidateId: string, cvUrl: string): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ google_drive_cv_url: cvUrl })
    .eq('candidate_id', candidateId);
  if (error) console.error('[db/candidates] updateCandidateCvUrl:', error.message);
}

export async function updateCandidateStage(
  candidateId: string,
  stage: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({ stage, stage_updated_at: new Date().toISOString() })
    .eq('candidate_id', candidateId);
  if (error) throw new Error(`updateCandidateStage: ${error.message}`);
}

export async function updateCandidateJob(
  candidateId: string,
  jobId: string,
  jobTitle: string,
  company: string,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({
      job_id:    jobId || null,
      job_title: jobTitle,
      company:   company || null,
    })
    .eq('candidate_id', candidateId);
  if (error) throw new Error(`updateCandidateJob: ${error.message}`);
}

export async function deleteCandidate(candidateId: string): Promise<void> {
  const { error } = await supabase.from('candidates').delete().eq('id', candidateId);
  if (error) throw new Error(`deleteCandidate: ${error.message}`);
}

export async function deleteCandidateWithDriveFile(
  candidateId: string,
): Promise<{ ok: boolean; driveFileDeleted: boolean }> {
  // 1. Fetch Drive URL from the application row
  const { data: apps } = await supabase
    .from('applications')
    .select('google_drive_cv_url')
    .eq('candidate_id', candidateId)
    .limit(1);

  const cvUrl     = apps?.[0]?.google_drive_cv_url as string | null;
  const fileId    = cvUrl ? extractDriveFileId(cvUrl) : null;
  let driveDeleted = false;

  // 2. Delete Drive file (best-effort — DB delete always proceeds)
  if (fileId) {
    const drive = getDriveClient();
    if (drive) {
      try {
        await drive.files.delete({ fileId });
        driveDeleted = true;
        console.log(`[db/candidates] Drive file ${fileId} deleted.`);
      } catch (err: unknown) {
        const status = (err as { code?: number })?.code;
        if (status === 404) {
          console.warn(`[db/candidates] Drive file ${fileId} already missing — continuing.`);
        } else {
          console.error(`[db/candidates] Drive delete error (continuing):`, err);
        }
      }
    }
  }

  // 3. Delete DB record (CASCADE deletes applications)
  const { error } = await supabase.from('candidates').delete().eq('id', candidateId);
  if (error) throw new Error(`deleteCandidateWithDriveFile (DB): ${error.message}`);

  return { ok: true, driveFileDeleted: driveDeleted };
}

export async function getCandidatesByEmailOrPhone(query: string): Promise<{
  id: string; name: string; position: string; company: string;
  stage: string; appliedAt: string; stageUpdatedAt: string;
}[]> {
  const q       = query.toLowerCase().trim();
  const qDigits = q.replace(/\D/g, '').replace(/^(95|0)/, '');

  // Fetch all then filter in-memory (phone normalisation requires JS)
  const { data, error } = await supabase
    .from('candidates')
    .select(`
      id, full_name, email, phone,
      applications ( job_title, company, stage, applied_at, stage_updated_at )
    `);

  if (error || !data) return [];

  return data
    .filter((c) => {
      const emailMatch = (c.email ?? '').toLowerCase() === q;
      const phoneDigits = c.phone.replace(/\D/g, '').replace(/^(95|0)/, '');
      const phoneMatch  = qDigits.length >= 5 && phoneDigits.includes(qDigits);
      return emailMatch || phoneMatch;
    })
    .flatMap((c) => {
      const apps = (c.applications as Record<string, string>[]) ?? [];
      if (apps.length === 0) return [];
      return apps.map((app) => ({
        id:             c.id,
        name:           c.full_name,
        position:       app.job_title ?? '',
        company:        app.company ?? '',
        stage:          app.stage ?? 'Applied',
        appliedAt:      app.applied_at ?? '',
        stageUpdatedAt: app.stage_updated_at ?? '',
      }));
    })
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
}
```

---

## Task 5: Create Remaining DB Modules

**Files:**
- Create: `src/lib/db/companies.ts`
- Create: `src/lib/db/leads.ts`
- Create: `src/lib/db/subscribers.ts`
- Create: `src/lib/db/feedback.ts`

- [ ] **Step 5.1: Write `src/lib/db/companies.ts`**

```ts
import { supabase } from '@/lib/supabase';
import type { Company, CompanyStatus } from '@/types';

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.warn('[db/companies] getCompanies:', error.message); return []; }
  return (data ?? []).map((r) => ({
    id:            r.id,
    name:          r.name,
    contactPerson: r.contact_person ?? '',
    email:         r.email ?? '',
    phone:         r.phone ?? '',
    industry:      r.industry ?? '',
    city:          r.city ?? '',
    status:        (r.status as CompanyStatus) ?? 'Lead',
    notes:         r.notes ?? '',
    lastContacted: r.last_contacted ?? '',
    createdAt:     r.created_at,
  }));
}

export async function appendCompany(data: {
  name: string; contactPerson: string; email: string; phone: string;
  industry: string; city: string; status?: CompanyStatus; notes?: string;
}): Promise<string> {
  const id = `co-${Date.now()}`;
  const { error } = await supabase.from('companies').insert({
    id,
    name:           data.name,
    contact_person: data.contactPerson,
    email:          data.email,
    phone:          data.phone,
    industry:       data.industry,
    city:           data.city,
    status:         data.status ?? 'Lead',
    notes:          data.notes ?? null,
  });
  if (error) throw new Error(`appendCompany: ${error.message}`);
  return id;
}

export async function updateCompanyStatus(
  companyId: string,
  status: CompanyStatus,
  notes?: string,
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    last_contacted: new Date().toISOString(),
  };
  if (notes !== undefined) update.notes = notes;
  const { error } = await supabase.from('companies').update(update).eq('id', companyId);
  if (error) throw new Error(`updateCompanyStatus: ${error.message}`);
}
```

- [ ] **Step 5.2: Write `src/lib/db/leads.ts`**

```ts
import { supabase } from '@/lib/supabase';
import type { B2bLead } from '@/types';

export async function getB2bLeads(): Promise<B2bLead[]> {
  const { data, error } = await supabase
    .from('b2b_leads')
    .select('*')
    .order('submitted_at', { ascending: false });
  if (error) { console.warn('[db/leads] getB2bLeads:', error.message); return []; }
  return (data ?? []).map((r) => ({
    id:             r.id,
    companyName:    r.company_name,
    industry:       r.industry ?? '',
    location:       r.location ?? '',
    website:        r.website ?? '',
    contactName:    r.contact_name,
    contactTitle:   r.contact_title ?? '',
    workEmail:      r.work_email,
    phone:          r.phone,
    jobTitle:       r.job_title,
    headcount:      r.headcount ?? '',
    workSetup:      r.work_setup ?? '',
    salaryBudget:   r.salary_budget ?? '',
    urgency:        r.urgency ?? '',
    requirements:   r.requirements ?? '',
    agencyMessage:  r.agency_message ?? '',
    jobDescription: r.job_description ?? '',
    benefits:       r.benefits ?? '',
    submittedAt:    r.submitted_at,
    status:         r.status ?? 'New',
  }));
}

export async function appendB2bLead(data: {
  companyName: string; industry: string; location: string; website: string;
  contactName: string; contactTitle: string; workEmail: string; phone: string;
  jobTitle: string; headcount: string; workSetup: string; salaryBudget: string;
  urgency: string; requirements: string; agencyMessage?: string;
  jobDescription?: string; benefits?: string;
}): Promise<string> {
  const id = `b2b-${Date.now()}`;
  const { error } = await supabase.from('b2b_leads').insert({
    id,
    company_name:    data.companyName,
    industry:        data.industry,
    location:        data.location,
    website:         data.website,
    contact_name:    data.contactName,
    contact_title:   data.contactTitle,
    work_email:      data.workEmail,
    phone:           data.phone,
    job_title:       data.jobTitle,
    headcount:       data.headcount,
    work_setup:      data.workSetup,
    salary_budget:   data.salaryBudget,
    urgency:         data.urgency,
    requirements:    data.requirements,
    agency_message:  data.agencyMessage ?? null,
    job_description: data.jobDescription ?? null,
    benefits:        data.benefits ?? null,
    status:          'New',
  });
  if (error) throw new Error(`appendB2bLead: ${error.message}`);
  return id;
}

export async function updateB2bLeadStatus(leadId: string, status: string): Promise<void> {
  const { error } = await supabase.from('b2b_leads').update({ status }).eq('id', leadId);
  if (error) throw new Error(`updateB2bLeadStatus: ${error.message}`);
}

export async function deleteB2bLead(leadId: string): Promise<void> {
  const { error } = await supabase.from('b2b_leads').delete().eq('id', leadId);
  if (error) throw new Error(`deleteB2bLead: ${error.message}`);
}
```

- [ ] **Step 5.3: Write `src/lib/db/subscribers.ts`**

```ts
import { supabase } from '@/lib/supabase';

export async function appendEmailSubscriber(data: {
  email: string; category?: string; ip?: string;
}): Promise<void> {
  const { error } = await supabase.from('subscribers').upsert(
    {
      email:    data.email,
      category: data.category ?? 'All',
      source:   'Website',
      ip:       data.ip ?? null,
    },
    { onConflict: 'email' },
  );
  if (error) throw new Error(`appendEmailSubscriber: ${error.message}`);
}
```

- [ ] **Step 5.4: Write `src/lib/db/feedback.ts`**

```ts
import { supabase } from '@/lib/supabase';

export async function appendFeedback(data: {
  candidateId: string; company: string; jobTitle: string;
  rating: number; experience: string; wouldRecommend: boolean;
}): Promise<void> {
  const id = `fb-${Date.now()}`;
  const { error } = await supabase.from('feedback').insert({
    id,
    candidate_id:     data.candidateId,
    company:          data.company,
    job_title:        data.jobTitle,
    rating:           data.rating,
    experience:       data.experience,
    would_recommend:  data.wouldRecommend,
  });
  if (error) throw new Error(`appendFeedback: ${error.message}`);
}

export async function getCompanyFeedback(company: string): Promise<{
  averageRating: number; totalReviews: number; wouldRecommendPct: number;
}> {
  const empty = { averageRating: 0, totalReviews: 0, wouldRecommendPct: 0 };
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('rating, would_recommend')
      .ilike('company', company);
    if (error || !data?.length) return empty;
    const ratings    = data.map((r) => r.rating).filter((n) => n > 0);
    const recommends = data.filter((r) => r.would_recommend).length;
    const avg        = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    return {
      averageRating:     avg,
      totalReviews:      data.length,
      wouldRecommendPct: Math.round((recommends / data.length) * 100),
    };
  } catch (err) {
    console.warn('[db/feedback] getCompanyFeedback:', (err as Error).message);
    return empty;
  }
}
```

---

## Task 6: Create `src/lib/db/index.ts` Barrel

**Files:** Create: `src/lib/db/index.ts`

- [ ] **Step 6.1: Write barrel**

```ts
export * from './jobs';
export * from './candidates';
export * from './companies';
export * from './leads';
export * from './subscribers';
export * from './feedback';
```

- [ ] **Step 6.2: Type-check**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6.3: Commit Phase 1 (infrastructure)**

```bash
git add src/lib/supabase.ts src/lib/db/ package.json package-lock.json
git commit -m "feat: add Supabase client + db layer (mirrors sheets.ts API)"
```

---

## Task 7: Update Candidates & Jobs Routes

**Files:** Modify 6 API route files

- [ ] **Step 7.1: `src/app/api/candidates/route.ts`** — change import

```ts
import { getCandidates } from '@/lib/db';
```

- [ ] **Step 7.2: `src/app/api/candidates/[id]/stage/route.ts`** — change import

```ts
import { updateCandidateStage } from '@/lib/db';
```

- [ ] **Step 7.3: `src/app/api/candidates/[id]/job/route.ts`** — change import

```ts
import { updateCandidateJob } from '@/lib/db';
```

- [ ] **Step 7.4: `src/app/api/candidates/[id]/cv-url/route.ts`** — change import

```ts
import { updateCandidateCvUrl } from '@/lib/db';
```

- [ ] **Step 7.5: `src/app/api/candidates/[id]/route.ts`** — dual-deletion rewrite

Replace entire file:
```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { deleteCandidateWithDriveFile } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  try {
    const result = await deleteCandidateWithDriveFile(id);
    return Response.json(result);
  } catch (err) {
    console.error('[candidates/delete]', err);
    return Response.json({ error: 'Could not delete candidate.' }, { status: 502 });
  }
}
```

- [ ] **Step 7.6: `src/app/api/jobs/route.ts`** — change import

```ts
import { getJobs, appendJob } from '@/lib/db';
```

- [ ] **Step 7.7: `src/app/api/jobs/[id]/route.ts`** — change import

```ts
import { deleteJob } from '@/lib/db';
```

---

## Task 8: Update Apply + Status Routes

**Files:** Modify `apply/route.ts` and `apply/status/route.ts`

- [ ] **Step 8.1: Rewrite `src/app/api/apply/route.ts`**

Remove `forwardToMake()`. Write cv_url directly in the INSERT (via `updateCandidateCvUrl` after Drive upload). Remove `makeWebhook` import:

```ts
import { z } from 'zod';
import { appendCandidate, updateCandidateCvUrl } from '@/lib/db';
import { createCandidateFolder, uploadFileToDrive } from '@/lib/drive';
import { checkRateLimit, getClientIp } from '@/lib/apiSecurity';
import type { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW_S = 600;
const RATE_LIMIT_MAX      = 5;

const applySchema = z
  .object({
    fullName:        z.string().min(2),
    email:           z.string().email().optional(),
    phone:           z.string().min(7),
    position:        z.string().min(2),
    jobId:           z.string().optional(),
    mode:            z.enum(['cv', 'linkedin']),
    cvBase64:        z.string().max(7_000_000, 'CV file must be 5 MB or smaller.').optional(),
    cvFileName:      z.string().max(255).optional(),
    linkedinUrl:     z.string().url().optional(),
    expectedSalary:  z.string().optional(),
    desiredCategory: z.string().optional(),
    noticePeriod:    z.string().optional(),
    cityLocation:    z.string().optional(),
    education:       z.string().optional(),
    experienceYears: z.string().optional(),
    currentCompany:  z.string().optional(),
    currentSalary:   z.string().optional(),
    languages:       z.string().optional(),
    skills:          z.string().optional(),
    portfolioUrl:    z.string().optional(),
  })
  .refine(
    (d) => d.mode === 'cv' ? Boolean(d.cvBase64 && d.cvFileName) : Boolean(d.linkedinUrl),
    { message: 'Provide either a CV or a LinkedIn URL.' },
  );

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`apply:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_S);
  if (!rl.allowed) {
    return Response.json(
      { error: 'Too many submissions. Please wait a few minutes and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After':           String(rl.resetIn),
          'X-RateLimit-Limit':     String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset':     String(Math.floor(Date.now() / 1000) + rl.resetIn),
        },
      },
    );
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Validation failed.' }, { status: 422 });
  }

  const {
    fullName, email, phone, position, jobId, cvBase64, cvFileName, linkedinUrl,
    expectedSalary, desiredCategory, noticePeriod, cityLocation, education,
    experienceYears, currentCompany, currentSalary, languages, skills, portfolioUrl,
  } = parsed.data;

  const candidateNotes = desiredCategory ? `Category: ${desiredCategory}` : undefined;

  let candidateId: string | undefined;
  try {
    candidateId = await appendCandidate({
      fullName, email, phone, position, jobId, linkedinUrl, cvFileName,
      expectedSalary, notes: candidateNotes, noticePeriod, cityLocation,
      education, experienceYears, currentCompany, currentSalary, languages,
      skills, portfolioUrl,
    });
    console.log(`[apply] Candidate "${fullName}" inserted into Supabase.`);
  } catch (err) {
    console.error('[apply] CRITICAL — Supabase insert failed:', err);
    return Response.json(
      { error: 'Could not save your application. Please try again or contact us directly.' },
      { status: 502 },
    );
  }

  // Upload CV to Drive (non-blocking) then update the cv_url in Supabase
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
  if (parentFolderId && cvBase64 && cvFileName) {
    (async () => {
      try {
        const folderId = await createCandidateFolder(fullName, parentFolderId);
        const driveUrl = await uploadFileToDrive({ name: cvFileName, base64: cvBase64 }, folderId);
        console.log(`[apply] CV uploaded to Drive for "${fullName}": ${driveUrl}`);
        if (candidateId) {
          await updateCandidateCvUrl(candidateId, driveUrl);
          console.log(`[apply] cv_url updated in Supabase for candidate ${candidateId}`);
        }
      } catch (err) {
        console.error('[apply] Drive upload error (non-critical — Supabase write succeeded):', err);
      }
    })();
  }

  return Response.json({ ok: true, confirmationSent: Boolean(email) });
}
```

- [ ] **Step 8.2: `src/app/api/apply/status/route.ts`** — change import

```ts
import { getCandidatesByEmailOrPhone } from '@/lib/db';
```

---

## Task 9: Update Remaining API Routes

**Files:** 8 route files

- [ ] **Step 9.1: `src/app/api/companies/route.ts`** — change import

```ts
import { getCompanies, appendCompany } from '@/lib/db';
```

- [ ] **Step 9.2: `src/app/api/companies/[id]/route.ts`** — change import

```ts
import { updateCompanyStatus } from '@/lib/db';
```

- [ ] **Step 9.3: `src/app/api/leads/route.ts`** — change import

```ts
import { getB2bLeads } from '@/lib/db';
```

- [ ] **Step 9.4: `src/app/api/leads/[id]/route.ts`** — change import

```ts
import { deleteB2bLead } from '@/lib/db';
```

- [ ] **Step 9.5: `src/app/api/leads/[id]/status/route.ts`** — change import

```ts
import { updateB2bLeadStatus } from '@/lib/db';
```

- [ ] **Step 9.6: `src/app/api/subscribe/route.ts`** — change import

```ts
import { appendEmailSubscriber } from '@/lib/db';
```

- [ ] **Step 9.7: `src/app/api/feedback/route.ts`** — change import

```ts
import { appendFeedback, getCompanyFeedback } from '@/lib/db';
```

- [ ] **Step 9.8: `src/app/api/employers/request/route.ts`** — change import; remove Make.com fire

```ts
import { appendB2bLead } from '@/lib/db';
```

Remove the entire `if (webhookUrl) { fetch(webhookUrl, ...) }` block. Return `{ ok: true, leadId }` directly after the insert.

- [ ] **Step 9.9: `src/app/api/cron/job-alerts/route.ts`** — change import

```ts
import { getJobs } from '@/lib/db';
```

- [ ] **Step 9.10: `src/app/api/cron/weekly-email/route.ts`** — change import

```ts
import { getCompanies, getJobs, getCandidates } from '@/lib/db';
```

- [ ] **Step 9.11: `src/app/api/webhooks/publish-job/route.ts`** — change import; remove Make.com block

Change import: `import { getJobs } from '@/lib/db';`

Remove the `MAKE_PUBLISH_URL` const and the entire `if (!MAKE_PUBLISH_URL)` + `try { const makeRes = await fetch(MAKE_PUBLISH_URL, ...)` block. The route returns `{ ok: true, payload }` after `triggerGitHubActions`.

- [ ] **Step 9.12: `src/app/api/content/distribute/route.ts`** — stub out Make.com

Replace the Make.com fetch block with:
```ts
return NextResponse.json(
  { ok: false, message: 'Direct social distribution not configured. Use the publish-job webhook instead.' },
  { status: 501 },
);
```

---

## Task 10: Update Page + Sitemap Files

**Files:** 5 page/sitemap files

- [ ] **Step 10.1:** Change `import { getJobs } from '@/lib/sheets'` → `'@/lib/db'` in:
  - `src/app/page.tsx`
  - `src/app/sitemap.ts`
  - `src/app/apply/[jobId]/page.tsx`
  - `src/app/jobs/[slug]/page.tsx`

- [ ] **Step 10.2:** Change imports in `src/app/companies/[slug]/page.tsx`

```ts
import { getJobs, getCompanyFeedback } from '@/lib/db';
```

---

## Task 11: Cleanup + Env + Typecheck + Commit

**Files:** Delete `src/lib/makeWebhook.ts`, modify `.env.example`

- [ ] **Step 11.1: Delete `src/lib/makeWebhook.ts`**

```bash
git rm src/lib/makeWebhook.ts
```

- [ ] **Step 11.2: Update `.env.example`**

Add at top:
```
# ── Supabase (primary database) ──────────────────────────────────────
SUPABASE_URL=https://gthewuhgrnnabyxkozvv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ── Google APIs (Drive for CV storage — keep these) ──────────────────
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GOOGLE_DRIVE_PARENT_FOLDER_ID=your_drive_folder_id
```

Mark old Sheets vars as archive:
```
# ── Google Sheets (ARCHIVE — no longer used by application code) ─────
# GOOGLE_SHEET_ID=...
# GOOGLE_JOBS_TAB=Jobs
# GOOGLE_CANDIDATES_TAB=Pipeline
# ...

# ── Make.com (DROPPED — no longer used) ─────────────────────────────
# MAKE_WEBHOOK_URL=...
# MAKE_PUBLISH_WEBHOOK_URL=...
# MAKE_EMPLOYER_WEBHOOK_URL=...
```

- [ ] **Step 11.3: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors. Fix any type mismatches before proceeding.

- [ ] **Step 11.4: Commit all changes**

```bash
git add -A
git commit -m "feat: migrate primary database from Google Sheets to Supabase PostgreSQL

- Drop Make.com and forwardToMake() entirely
- Create src/lib/supabase.ts singleton client
- Create src/lib/db/ with 7 modules (jobs, candidates, companies, leads, subscribers, feedback)
- Implement dual-deletion in deleteCandidateWithDriveFile (Drive file + Supabase row)
- Update all 25 source files to import from @/lib/db instead of @/lib/sheets
- Delete src/lib/makeWebhook.ts
- Apply 7-table schema to Supabase (gthewuhgrnnabyxkozvv)"
```

- [ ] **Step 11.5: Push to main**

```bash
git push origin main
```

- [ ] **Step 11.6: Verify Vercel deployment logs**

Check Vercel dashboard → Deployments → latest → confirm build succeeds and no runtime errors on `/api/jobs`.

---

## Post-Deployment: Add Secrets to Vercel

Add these two env vars to the Vercel project (Settings → Environment Variables):
- `SUPABASE_URL` = `https://gthewuhgrnnabyxkozvv.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (from Supabase Dashboard → Project Settings → API → `service_role`)

Then trigger a redeploy.
