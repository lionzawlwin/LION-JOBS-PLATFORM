# Legal Docs Subsystem Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual (Burmese + English) printable B2B Service Contract for corporate clients and a digital anti-bypass consent gate for candidates, both driven by a single editable `agency_settings` row, surfaced in a new "Legal" dashboard tab.

**Architecture:** Extends the existing Supabase schema (`companies`, `applications`) and `src/lib/db/*` one-file-per-table convention with one new config table (`agency_settings`) and one new audit table (`candidate_consents`). A new print-only Next.js route renders the contract server-side with no site chrome. The candidate-facing gate hooks into the existing `/my-applications` → `/api/apply/status` flow that already exists — no new candidate authentication is introduced.

**Tech Stack:** Next.js 16 App Router (Route Handlers, Server Components), Supabase (`@supabase/supabase-js`), next-auth (existing `requireAdmin`-equivalent pattern), SWR, Tailwind v4 (`print:` variant for the print route), no test framework (per `CLAUDE.md` — verification is `npx tsc --noEmit`, `npm run lint`, and manual walkthrough).

---

## ⚠️ Legal disclaimer (read before Task 13)

The Burmese and English clause text in Task 13 is a functional draft written to prove out the system (data binding, print layout, consent flow) — **it is not certified legal translation.** Before using a generated contract for a real physical signing, or relying on the anti-bypass terms to actually deter or penalize a candidate, have a Myanmar-qualified lawyer review and, if needed, replace the wording in `ContractDocument.tsx` and `AntiBypassConsentModal.tsx`. This plan builds the mechanism; it does not substitute for legal review of the words themselves.

---

## Task 1: Database migration

**Files:**
- Create: `supabase/migrations/add_legal_docs.sql`

This project has no migration runner — `supabase/migrations/*.sql` files are pasted into the Supabase SQL Editor by hand (see `add_enterprise_crm.sql` for the established pattern). This task follows the same convention.

- [ ] **Step 1: Write the migration file**

```sql
-- Legal Docs subsystem: agency settings, per-company commission override,
-- candidate interview details, and anti-bypass consent records.
-- Run this in Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS agency_settings (
  id                              TEXT PRIMARY KEY DEFAULT 'default',
  default_commission_rate_pct     NUMERIC NOT NULL DEFAULT 60,
  default_guarantee_days          INTEGER NOT NULL DEFAULT 60,
  default_replacement_cost_mmk    INTEGER NOT NULL DEFAULT 0,
  anti_bypass_penalty_mmk         INTEGER NOT NULL DEFAULT 500000,
  anti_bypass_restriction_months  INTEGER NOT NULL DEFAULT 12,
  terms_version                   TEXT NOT NULL DEFAULT 'v1',
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the single settings row so getAgencySettings() always finds one.
INSERT INTO agency_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS commission_rate_pct NUMERIC;

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS interview_location TEXT,
  ADD COLUMN IF NOT EXISTS interviewer_contact TEXT;

-- application_id is nullable with ON DELETE SET NULL (not CASCADE): this table
-- is a legal-evidentiary audit trail (proof a candidate agreed to specific terms
-- at a specific time). It must outlive the candidate/application record it was
-- attached to, not vanish the moment an admin deletes that candidate.
CREATE TABLE IF NOT EXISTS candidate_consents (
  id             TEXT PRIMARY KEY,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  consent_type   TEXT NOT NULL DEFAULT 'anti_bypass',
  terms_version  TEXT NOT NULL,
  agreed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address     TEXT,
  user_agent     TEXT
);

CREATE INDEX IF NOT EXISTS idx_candidate_consents_application_id ON candidate_consents(application_id);
```

> **Amended after Task 1's code quality review:** the original draft used `ON DELETE CASCADE`, which a reviewer correctly flagged as defeating the table's audit-trail purpose (consent evidence would vanish the moment a candidate/application is deleted). Changed to nullable `application_id` with `ON DELETE SET NULL` so the timestamped consent record survives deletion.

- [ ] **Step 2: Run it in Supabase**

Open the Supabase dashboard → SQL Editor → paste the contents of `add_legal_docs.sql` → Run.

- [ ] **Step 3: Verify**

Run in the same SQL Editor:

```sql
SELECT * FROM agency_settings;
```

Expected: exactly one row, `id = 'default'`, `default_commission_rate_pct = 60`, `terms_version = 'v1'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/add_legal_docs.sql
git commit -m "feat(db): add agency_settings, candidate_consents tables and commission/interview columns"
```

---

## Task 2: Types

**Files:**
- Modify: `src/types/index.ts:48-78` (Candidate interface)
- Modify: `src/types/index.ts` (Company interface — locate via `interface Company`)
- Modify: `src/types/index.ts` (add two new interfaces at end of file)

- [ ] **Step 1: Extend `Candidate` with interview-details + consent-gate fields**

In `src/types/index.ts`, inside `export interface Candidate { ... }`, add after the existing `interviewDate?: string;` line:

```typescript
  interviewLocation?: string;
  interviewerContact?: string;
  needsConsent?: boolean;
```

- [ ] **Step 2: Extend `Company` with the commission override**

Find `export interface Company {` and add:

```typescript
  commissionRatePct?: number | null;
```

- [ ] **Step 3: Add `AgencySettings` and `ConsentRecord` types**

Append to the end of `src/types/index.ts`:

```typescript
export interface AgencySettings {
  defaultCommissionRatePct: number;
  defaultGuaranteeDays: number;
  defaultReplacementCostMmk: number;
  antiBypassPenaltyMmk: number;
  antiBypassRestrictionMonths: number;
  termsVersion: string;
}

export interface ConsentRecord {
  id: string;
  applicationId: string;
  termsVersion: string;
  agreedAt: string;
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors (existing code that constructs `Candidate`/`Company` objects doesn't need these new optional fields, so nothing else should break).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add AgencySettings, ConsentRecord, and legal-docs fields"
```

---

## Task 3: `agency_settings` and `candidate_consents` data access

**Files:**
- Create: `src/lib/db/legalSettings.ts`
- Create: `src/lib/db/consents.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Write `src/lib/db/legalSettings.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { AgencySettings } from '@/types';

const DEFAULTS: AgencySettings = {
  defaultCommissionRatePct:    60,
  defaultGuaranteeDays:        60,
  defaultReplacementCostMmk:   0,
  antiBypassPenaltyMmk:        500000,
  antiBypassRestrictionMonths: 12,
  termsVersion:                'v1',
};

function mapToSettings(row: Record<string, unknown>): AgencySettings {
  return {
    defaultCommissionRatePct:    Number(row.default_commission_rate_pct ?? DEFAULTS.defaultCommissionRatePct),
    defaultGuaranteeDays:        Number(row.default_guarantee_days ?? DEFAULTS.defaultGuaranteeDays),
    defaultReplacementCostMmk:   Number(row.default_replacement_cost_mmk ?? DEFAULTS.defaultReplacementCostMmk),
    antiBypassPenaltyMmk:        Number(row.anti_bypass_penalty_mmk ?? DEFAULTS.antiBypassPenaltyMmk),
    antiBypassRestrictionMonths: Number(row.anti_bypass_restriction_months ?? DEFAULTS.antiBypassRestrictionMonths),
    termsVersion:                (row.terms_version as string) ?? DEFAULTS.termsVersion,
  };
}

export async function getAgencySettings(): Promise<AgencySettings> {
  const { data, error } = await supabase
    .from('agency_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (error || !data) {
    console.error('[db/legalSettings] getAgencySettings error:', error?.message);
    return DEFAULTS;
  }
  return mapToSettings(data);
}

export async function updateAgencySettings(data: Partial<{
  defaultCommissionRatePct:    number;
  defaultGuaranteeDays:        number;
  defaultReplacementCostMmk:   number;
  antiBypassPenaltyMmk:        number;
  antiBypassRestrictionMonths: number;
  termsVersion:                string;
}>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.defaultCommissionRatePct    !== undefined) update.default_commission_rate_pct = data.defaultCommissionRatePct;
  if (data.defaultGuaranteeDays        !== undefined) update.default_guarantee_days = data.defaultGuaranteeDays;
  if (data.defaultReplacementCostMmk   !== undefined) update.default_replacement_cost_mmk = data.defaultReplacementCostMmk;
  if (data.antiBypassPenaltyMmk        !== undefined) update.anti_bypass_penalty_mmk = data.antiBypassPenaltyMmk;
  if (data.antiBypassRestrictionMonths !== undefined) update.anti_bypass_restriction_months = data.antiBypassRestrictionMonths;
  if (data.termsVersion                !== undefined) update.terms_version = data.termsVersion;

  const { error } = await supabase.from('agency_settings').update(update).eq('id', 'default');
  if (error) throw new Error(`Failed to update agency settings: ${error.message}`);
}
```

- [ ] **Step 2: Write `src/lib/db/consents.ts`**

```typescript
import { supabase } from '@/lib/supabase';
import type { ConsentRecord } from '@/types';

function mapToConsent(row: Record<string, unknown>): ConsentRecord {
  return {
    id:            row.id as string,
    applicationId: row.application_id as string,
    termsVersion:  row.terms_version as string,
    agreedAt:      row.agreed_at as string,
  };
}

export async function recordConsent(data: {
  applicationId: string;
  termsVersion:  string;
  ipAddress?:    string;
  userAgent?:    string;
}): Promise<void> {
  const id = `cc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from('candidate_consents').insert({
    id,
    application_id: data.applicationId,
    consent_type:   'anti_bypass',
    terms_version:  data.termsVersion,
    ip_address:     data.ipAddress ?? null,
    user_agent:     data.userAgent ?? null,
  });
  if (error) throw new Error(`Failed to record consent: ${error.message}`);
}

export async function getConsentForApplication(applicationId: string): Promise<ConsentRecord | null> {
  const { data, error } = await supabase
    .from('candidate_consents')
    .select('*')
    .eq('application_id', applicationId)
    .order('agreed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return mapToConsent(data);
}

export async function getConsentedApplicationIds(
  applicationIds: string[],
  termsVersion:   string,
): Promise<Set<string>> {
  if (applicationIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('candidate_consents')
    .select('application_id')
    .in('application_id', applicationIds)
    .eq('terms_version', termsVersion);

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.application_id as string));
}
```

- [ ] **Step 3: Export both from the barrel file**

In `src/lib/db/index.ts`, add two lines (matching the existing pattern of one `export *` per file):

```typescript
export * from './legalSettings';
export * from './consents';
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/legalSettings.ts src/lib/db/consents.ts src/lib/db/index.ts
git commit -m "feat(db): add agency_settings and candidate_consents data access"
```

---

## Task 4: Extend `companies` and `candidates` data access

**Files:**
- Modify: `src/lib/db/companies.ts`
- Modify: `src/lib/db/candidates.ts`

- [ ] **Step 1: Add `commissionRatePct` to `mapToCompany` in `companies.ts`**

In `src/lib/db/companies.ts`, inside `mapToCompany`, add after the `notes` line:

```typescript
    commissionRatePct: row.commission_rate_pct === null || row.commission_rate_pct === undefined
      ? null
      : Number(row.commission_rate_pct),
```

- [ ] **Step 2: Add `getCompanyById` and `updateCompanyCommissionRate` to `companies.ts`**

Append to `src/lib/db/companies.ts`:

```typescript
export async function getCompanyById(id: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapToCompany(data);
}

export async function updateCompanyCommissionRate(
  id: string,
  commissionRatePct: number | null,
): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ commission_rate_pct: commissionRatePct })
    .eq('id', id);
  if (error) throw new Error(`Failed to update commission rate: ${error.message}`);
}
```

- [ ] **Step 3: Add `interview_location`/`interviewer_contact` to the `AppRow` interface and `mapToCandidate` in `candidates.ts`**

In `src/lib/db/candidates.ts`, inside `interface AppRow { ... }`, add after `interview_date: string | null;`:

```typescript
  interview_location: string | null;
  interviewer_contact: string | null;
```

Inside `function mapToCandidate(...)`, add after the `interviewDate:` line:

```typescript
    interviewLocation:   app.interview_location ?? undefined,
    interviewerContact:  app.interviewer_contact ?? undefined,
```

- [ ] **Step 4: Add the two new columns to both `select()` calls in `candidates.ts`**

`getCandidates()` and `getCandidatesByEmailOrPhone()` each have a Supabase `.select()` with an inline `applications ( ... )` field list containing `notes, salary_expected, interview_date,`. In **both** occurrences, change that line to:

```typescript
        notes, salary_expected, interview_date, interview_location, interviewer_contact,
```

- [ ] **Step 5: Add `updateCandidateInterviewDetails` and `getApplicationInterviewLocation` to `candidates.ts`**

Append to `src/lib/db/candidates.ts`:

```typescript
export async function updateCandidateInterviewDetails(
  applicationId:      string,
  interviewLocation:  string,
  interviewerContact: string,
): Promise<void> {
  const { error } = await supabase
    .from('applications')
    .update({
      interview_location:  interviewLocation || null,
      interviewer_contact: interviewerContact || null,
    })
    .eq('id', applicationId);
  if (error) throw new Error(`Failed to update interview details: ${error.message}`);
}

export async function getApplicationInterviewLocation(applicationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('applications')
    .select('interview_location')
    .eq('id', applicationId)
    .maybeSingle();

  if (error || !data) return null;
  return (data.interview_location as string) ?? null;
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/db/companies.ts src/lib/db/candidates.ts
git commit -m "feat(db): add commission rate and interview-details accessors"
```

---

## Task 5: Legal settings API route

**Files:**
- Create: `src/app/api/legal/settings/route.ts`

GET is intentionally public (no PII — just the business terms) because the candidate-facing consent modal (Task 12) needs to read the current penalty/version values without an admin session. PATCH stays admin-gated.

- [ ] **Step 1: Write the route**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getAgencySettings, updateAgencySettings } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function GET() {
  const settings = await getAgencySettings();
  return Response.json(settings);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    await updateAgencySettings(body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[legal/settings/patch]', err);
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, then in another terminal:

```bash
curl http://localhost:3000/api/legal/settings
```

Expected: JSON body with `defaultCommissionRatePct: 60`, `termsVersion: "v1"`, etc.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/legal/settings/route.ts
git commit -m "feat(api): add agency settings GET/PATCH route"
```

---

## Task 6: Commission rate on the companies route

**Files:**
- Modify: `src/app/api/companies/[id]/route.ts`

- [ ] **Step 1: Accept `commissionRatePct` in the PATCH body**

In `src/app/api/companies/[id]/route.ts`, change the `PATCH` function's body-parsing and dispatch to also accept and apply `commissionRatePct`:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCompanyStatus, updateCompanyTier, updateCompanyCommissionRate, deleteCompany } from '@/lib/db';
import type { NextRequest } from 'next/server';
import type { CompanyStatus, CompanyTier } from '@/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as {
    status?:            CompanyStatus;
    notes?:             string;
    tier?:              CompanyTier;
    commissionRatePct?: number | null;
  };
  if (!body.status && !body.tier && body.commissionRatePct === undefined) {
    return Response.json({ error: 'status, tier, or commissionRatePct is required.' }, { status: 422 });
  }
  try {
    if (body.status) await updateCompanyStatus(id, body.status, body.notes);
    if (body.tier)   await updateCompanyTier(id, body.tier);
    if (body.commissionRatePct !== undefined) await updateCompanyCommissionRate(id, body.commissionRatePct);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

(The `DELETE` export below it is unchanged — leave it as-is.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/companies/[id]/route.ts
git commit -m "feat(api): accept commissionRatePct override on company PATCH"
```

---

## Task 7: Interview-details PATCH, consent GET+POST, and batch consent-status routes (admin + public)

**Files:**
- Create: `src/app/api/candidates/[id]/interview/route.ts`
- Create: `src/app/api/candidates/[id]/consent/route.ts`
- Create: `src/app/api/legal/consents-status/route.ts`

Per the approved spec, the candidate-facing consent endpoint is `POST /api/candidates/{id}/consent` — public, no admin session. The same file also exports an admin-gated `GET` for the Candidate Drawer's consent badge (Task 13). Next.js Route Handlers support multiple HTTP methods per file with independent auth per method, so both live in one file rather than being split across `/api/candidates/*` (admin) and `/api/apply/*` (public) route families.

- [ ] **Step 1: Write the interview-details PATCH route**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { updateCandidateInterviewDetails } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  let body: { interviewLocation?: string; interviewerContact?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    await updateCandidateInterviewDetails(id, body.interviewLocation ?? '', body.interviewerContact ?? '');
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[interview/patch]', err);
    return Response.json({ error: 'Could not update interview details.' }, { status: 502 });
  }
}
```

- [ ] **Step 2: Write the merged consent route — admin `GET` (drawer badge) + public `POST` (candidate consent)**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getConsentForApplication, getApplicationInterviewLocation, getAgencySettings, recordConsent } from '@/lib/db';
import { getClientIp, checkRateLimit } from '@/lib/apiSecurity';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

// Admin-only: read consent status for the Candidate Drawer badge.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const consent = await getConsentForApplication(id);
  return Response.json({ consent });
}

// Public: candidate-facing consent submission from the AntiBypassConsentModal.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`candidate-consent:${ip}`, 10, 60);
  if (!rl.allowed) {
    return Response.json({ error: 'Too many requests. Please wait a minute.' }, { status: 429 });
  }

  const { id } = await context.params;

  const location = await getApplicationInterviewLocation(id);
  if (!location) {
    return Response.json({ error: 'No interview details available yet for this application.' }, { status: 400 });
  }

  const settings = await getAgencySettings();

  try {
    await recordConsent({
      applicationId: id,
      termsVersion:  settings.termsVersion,
      ipAddress:     ip,
      userAgent:     req.headers.get('user-agent') ?? undefined,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error('[candidates/consent/post]', err);
    return Response.json({ error: 'Could not record consent.' }, { status: 502 });
  }
}
```

- [ ] **Step 3: Write the batch consent-status POST route (for the Legal tab's Candidate Consents list)**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getAgencySettings, getConsentedApplicationIds } from '@/lib/db';
import type { NextRequest } from 'next/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { applicationIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const ids = body.applicationIds ?? [];
  const settings = await getAgencySettings();
  const consented = await getConsentedApplicationIds(ids, settings.termsVersion);
  return Response.json({ consented: Array.from(consented) });
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification of the public POST path**

With `npm run dev` running:

```bash
curl -X POST http://localhost:3000/api/candidates/does-not-exist/consent
```

Expected: `{"error":"No interview details available yet for this application."}` with status 400 (no `interview_location` set for a non-existent id) — confirms the route is reachable without a session.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/candidates/[id]/interview/route.ts src/app/api/candidates/[id]/consent/route.ts src/app/api/legal/consents-status/route.ts
git commit -m "feat(api): add interview details, consent GET/POST, and batch consent status routes"
```

---

## Task 8: `/api/apply/status` gating

**Files:**
- Modify: `src/app/api/apply/status/route.ts`

- [ ] **Step 1: Gate interview details behind consent in `/api/apply/status`**

Replace the body of `src/app/api/apply/status/route.ts`'s `GET` function (everything from `const query = ...` to the final `return`) with:

```typescript
  const query = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 5) {
    return NextResponse.json(
      { error: 'Please enter at least 5 characters.' },
      { status: 400 },
    );
  }

  const candidates = await getCandidatesByEmailOrPhone(query);
  const settings = await getAgencySettings();
  const consented = await getConsentedApplicationIds(candidates.map((c) => c.id), settings.termsVersion);

  const results = candidates.map((c) => {
    const hasInterviewDetails = Boolean(c.interviewLocation);
    const isConsented = consented.has(c.id);
    return {
      id:                 c.id,
      name:               c.name,
      position:           c.position,
      company:            c.company,
      stage:              c.stage,
      appliedAt:          c.appliedAt,
      needsConsent:       hasInterviewDetails && !isConsented,
      interviewLocation:  isConsented ? c.interviewLocation  : undefined,
      interviewerContact: isConsented ? c.interviewerContact : undefined,
    };
  });

  return NextResponse.json({ results });
```

And update the import line at the top of that file from:

```typescript
import { getCandidatesByEmailOrPhone } from '@/lib/db';
```

to:

```typescript
import { getCandidatesByEmailOrPhone, getAgencySettings, getConsentedApplicationIds } from '@/lib/db';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

With `npm run dev` running, and a candidate that has `interview_location` set from Task 7 Step 5 (or Task 13's walkthrough), search for them on `/my-applications` and confirm `needsConsent: true` appears in the raw response before consenting:

```bash
curl "http://localhost:3000/api/apply/status?q=<their-email-or-phone>"
```

Expected: the matching result has `"needsConsent":true` and no `interviewLocation` field populated (undefined fields are omitted by `NextResponse.json`).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/apply/status/route.ts
git commit -m "feat(api): gate interview details behind anti-bypass consent in apply/status"
```

---

## Task 9: i18n keys for the Legal tab

**Files:**
- Modify: `src/lib/i18n.ts`

- [ ] **Step 1: Add English keys**

In `src/lib/i18n.ts`, in the `en` block, change line 185 from:

```typescript
    admin_tab_campaigns:   'Email Campaigns',
```

to:

```typescript
    admin_tab_campaigns:   'Email Campaigns',
    admin_tab_legal:       'Legal',
```

And change line 196 (`admin_banner_campaigns`) from:

```typescript
    admin_banner_campaigns:   ' Send marketing emails to employers. Powered by Resend (3K/month free).',
```

to:

```typescript
    admin_banner_campaigns:   ' Send marketing emails to employers. Powered by Resend (3K/month free).',
    admin_banner_legal:       ' B2B service contracts and candidate anti-bypass consent tracking.',
```

- [ ] **Step 2: Add Burmese keys**

In the `my` block, change line 795 (`admin_tab_campaigns`) from:

```typescript
    admin_tab_campaigns:   'အီးမေးလ် ကမ်ပိန်းများ',
```

to:

```typescript
    admin_tab_campaigns:   'အီးမေးလ် ကမ်ပိန်းများ',
    admin_tab_legal:       'ဥပဒေရေးရာ',
```

And change line 806 (`admin_banner_campaigns`) from:

```typescript
    admin_banner_campaigns:   ' အလုပ်ရှင်များထံ စျေးကွက်ရှာဖွေရေး အီးမေးလ်များ ပို့ပါ။ Resend မှ ပံ့ပိုးသည် (လစဉ် ၃,၀၀၀ အခမဲ့)။',
```

to:

```typescript
    admin_banner_campaigns:   ' အလုပ်ရှင်များထံ စျေးကွက်ရှာဖွေရေး အီးမေးလ်များ ပို့ပါ။ Resend မှ ပံ့ပိုးသည် (လစဉ် ၃,၀၀၀ အခမဲ့)။',
    admin_banner_legal:       ' B2B စာချုပ်များနှင့် ကိုယ်စားလှယ်လောင်း သဘောတူညီချက် ခြေရာခံမှု။',
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (the `TranslationKey` type is derived from `typeof translations['en']`, so both language blocks must define the same key set — Steps 1 and 2 keep them in sync).

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): add Legal tab label and banner translations"
```

---

## Task 10: Add the "Legal" tab to `DashboardClient.tsx`

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Add the tab type, icon import, and nav entry**

Change the `Tab` type (line 19) from:

```typescript
type Tab = 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies' | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns';
```

to:

```typescript
type Tab = 'overview' | 'candidates' | 'post-job' | 'manage-jobs' | 'companies' | 'enterprise' | 'b2b-leads' | 'content' | 'campaigns' | 'legal';
```

Add `Scale` to the lucide-react import (line 4), and add `LegalView` to the component imports (after the `EmailCampaigns` import):

```typescript
import { BarChart2, Building2, Landmark, Users, Info, PenSquare, Mail, LayoutGrid, Table2, PlusSquare, Briefcase, ClipboardList, Scale } from 'lucide-react';
```

```typescript
import { LegalView } from './LegalView';
```

Add to the `TABS` array (after the `campaigns` entry):

```typescript
    { value: 'legal',      label: t('admin_tab_legal'),      icon: <Scale         size={14} /> },
```

- [ ] **Step 2: Add the banner line and tab render**

Add to the context banner's conditional list (after the `campaigns` line):

```typescript
          {activeTab === 'legal'       && t('admin_banner_legal')}
```

Add to the tab-content render list (after `{activeTab === 'campaigns' && <EmailCampaigns />}`):

```typescript
      {activeTab === 'legal'       && <LegalView />}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: fails with "Cannot find module './LegalView'" until Task 11 creates it — that's expected at this point. Proceed to Task 11 before committing.

- [ ] **Step 4: Commit** (after Task 11's file exists)

```bash
git add src/components/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): wire Legal tab into DashboardClient"
```

---

## Task 11: `LegalView.tsx` — Agency Settings + B2B Contracts + Candidate Consents

**Files:**
- Create: `src/components/dashboard/LegalView.tsx`

This follows `CompaniesView.tsx`'s established pattern: `useState` + `fetch` in a `useCallback` loader (no SWR), plain Tailwind cards, no additional i18n wiring beyond the tab label/banner already added in Task 9 (this view's internal copy is English-only — the bilingual requirement applies to the printed/candidate-facing legal documents themselves, not this internal admin screen).

- [ ] **Step 1: Write the component**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Printer, Save, ShieldCheck, ShieldAlert } from 'lucide-react';
import type { Company, Candidate, AgencySettings } from '@/types';

export function LegalView() {
  const [settings, setSettings]   = useState<AgencySettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [consentedIds, setConsentedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading]     = useState(true);
  const [savingRateId, setSavingRateId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, companiesRes, candidatesRes] = await Promise.all([
        fetch('/api/legal/settings'),
        fetch('/api/companies'),
        fetch('/api/candidates'),
      ]);
      const settingsData:   AgencySettings = await settingsRes.json();
      const companiesData:  Company[]      = companiesRes.ok ? await companiesRes.json() : [];
      const candidatesData: Candidate[]     = candidatesRes.ok ? await candidatesRes.json() : [];

      setSettings(settingsData);
      setCompanies(companiesData);

      const interviewCandidates = candidatesData.filter(
        (c) => c.stage === 'Interview' && Boolean(c.interviewLocation),
      );
      setCandidates(interviewCandidates);

      if (interviewCandidates.length > 0) {
        const statusRes = await fetch('/api/legal/consents-status', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ applicationIds: interviewCandidates.map((c) => c.id) }),
        });
        if (statusRes.ok) {
          const { consented } = await statusRes.json() as { consented: string[] };
          setConsentedIds(new Set(consented));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings() {
    if (!settings) return;
    // The terms-version confirm() already ran in its own onChange handler below —
    // by the time Save is clicked, settings.termsVersion is already confirmed.
    setSavingSettings(true);
    try {
      await fetch('/api/legal/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(settings),
      });
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveCommissionRate(companyId: string, value: string) {
    const parsed = value.trim() === '' ? null : Number(value);
    if (parsed !== null && Number.isNaN(parsed)) return;
    setSavingRateId(companyId);
    try {
      await fetch(`/api/companies/${companyId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ commissionRatePct: parsed }),
      });
      setCompanies((prev) => prev.map((c) => c.id === companyId ? { ...c, commissionRatePct: parsed } : c));
    } finally {
      setSavingRateId(null);
    }
  }

  if (loading || !settings) {
    return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Agency Settings */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Agency Settings</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-muted-foreground">
            Default commission rate (%)
            <input
              type="number"
              value={settings.defaultCommissionRatePct}
              onChange={(e) => setSettings({ ...settings, defaultCommissionRatePct: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Guarantee window (days)
            <input
              type="number"
              value={settings.defaultGuaranteeDays}
              onChange={(e) => setSettings({ ...settings, defaultGuaranteeDays: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Replacement cost (MMK)
            <input
              type="number"
              value={settings.defaultReplacementCostMmk}
              onChange={(e) => setSettings({ ...settings, defaultReplacementCostMmk: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Anti-bypass penalty (MMK)
            <input
              type="number"
              value={settings.antiBypassPenaltyMmk}
              onChange={(e) => setSettings({ ...settings, antiBypassPenaltyMmk: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Non-circumvention restriction (months)
            <input
              type="number"
              value={settings.antiBypassRestrictionMonths}
              onChange={(e) => setSettings({ ...settings, antiBypassRestrictionMonths: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Terms version
            <input
              type="text"
              value={settings.termsVersion}
              onChange={(e) => {
                if (e.target.value !== settings.termsVersion) {
                  if (!confirm('Changing the terms version requires future candidates to re-consent. Continue?')) return;
                }
                setSettings({ ...settings, termsVersion: e.target.value });
              }}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
        </div>
        <button
          onClick={saveSettings}
          disabled={savingSettings}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {savingSettings ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Settings
        </button>
      </div>

      {/* B2B Service Contracts */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">B2B Service Contracts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="pb-2">Company</th>
                <th className="pb-2">Commission Override (%)</th>
                <th className="pb-2">Effective Rate</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((co) => (
                <tr key={co.id} className="border-b border-border/50">
                  <td className="py-2 font-medium text-foreground">{co.name}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      defaultValue={co.commissionRatePct ?? ''}
                      placeholder={String(settings.defaultCommissionRatePct)}
                      onBlur={(e) => saveCommissionRate(co.id, e.target.value)}
                      disabled={savingRateId === co.id}
                      className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="py-2 text-muted-foreground">
                    {co.commissionRatePct ?? settings.defaultCommissionRatePct}%
                    {co.commissionRatePct == null && <span className="ml-1 text-[10px]">(default)</span>}
                  </td>
                  <td className="py-2">
                    <a
                      href={`/dashboard/legal/contract/${co.id}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-fit items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
                    >
                      <Printer size={12} /> Print Contract
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Consents */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-foreground">Candidate Consents (Interview stage)</h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No candidates at Interview stage with interview details set yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="pb-2">Candidate</th>
                  <th className="pb-2">Position</th>
                  <th className="pb-2">Company</th>
                  <th className="pb-2">Consent</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2 font-medium text-foreground">{c.name}</td>
                    <td className="py-2 text-muted-foreground">{c.position}</td>
                    <td className="py-2 text-muted-foreground">{c.company}</td>
                    <td className="py-2">
                      {consentedIds.has(c.id) ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck size={12} /> Agreed</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-amber-600"><ShieldAlert size={12} /> Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (this also resolves Task 10's pending "Cannot find module" error).

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/LegalView.tsx
git commit -m "feat(dashboard): add LegalView (agency settings, contracts, consent tracking)"
```

Now go back and complete Task 10, Step 4's commit if it wasn't already done.

---

## Task 12: Print route

**Files:**
- Create: `src/components/legal/ContractDocument.tsx`
- Create: `src/components/legal/AutoPrint.tsx`
- Create: `src/app/dashboard/legal/contract/[companyId]/print/page.tsx`

Recall from exploring `src/app/dashboard/page.tsx`: this project has **no shared dashboard layout** — `Navbar`/`Footer` are included per-page, not globally. That means this print route, by simply not importing them, renders with zero site chrome automatically. No global CSS changes are needed.

- [ ] **Step 1: Write the bilingual document component**

```typescript
import type { Company, AgencySettings } from '@/types';

interface Props {
  company:  Company;
  settings: AgencySettings;
}

export function ContractDocument({ company, settings }: Props) {
  const rate = company.commissionRatePct ?? settings.defaultCommissionRatePct;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-black print:p-0">
      <h1 className="mb-1 text-center text-xl font-bold">B2B Service Contract / စီးပွားရေးဝန်ဆောင်မှု စာချုပ်</h1>
      <p className="mb-6 text-center text-sm text-gray-600">Lion Jobs Agency — {today}</p>

      <section className="mb-4">
        <h2 className="font-semibold">1. Parties / စာချုပ်ပါဝင်သူများ</h2>
        <p className="text-sm">
          This agreement is between Lion Jobs Agency ("the Agency") and {company.name} ("the Client"), contact: {company.contactPerson || '—'}.
        </p>
        <p className="text-sm">
          ဤစာချုပ်ကို Lion Jobs Agency ("အေဂျင်စီ") နှင့် {company.name} ("ဖောက်သည်") တို့အကြား ချုပ်ဆိုသည်။ ဆက်သွယ်ရမည့်သူ - {company.contactPerson || '—'}
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold">2. Commission / ဝန်ဆောင်မှုခ</h2>
        <p className="text-sm">
          The Agency shall charge a service commission equal to {rate}% of the placed candidate&apos;s basic monthly salary.
        </p>
        <p className="text-sm">
          အေဂျင်စီသည် ခန့်အပ်ပေးသည့် ကိုယ်စားလှယ်လောင်း၏ လစဉ်အခြေခံလစာ၏ {rate}% ကို ဝန်ဆောင်မှုခအဖြစ် ကောက်ခံပါမည်။
        </p>
      </section>

      <section className="mb-4">
        <h2 className="font-semibold">3. Replacement Guarantee / အစားထိုးအာမခံချက်</h2>
        <p className="text-sm">
          Should the placed candidate resign or be terminated for cause within {settings.defaultGuaranteeDays} days of their start date, the Agency will provide one free replacement candidate at {settings.defaultReplacementCostMmk} MMK additional cost.
        </p>
        <p className="text-sm">
          ခန့်အပ်ခံရသူသည် အလုပ်စတင်ချိန်မှ ရက်ပေါင်း {settings.defaultGuaranteeDays} အတွင်း နှုတ်ထွက် (သို့) အကြောင်းပြချက်ဖြင့် ထုတ်ပယ်ခံရပါက အေဂျင်စီမှ ကိုယ်စားလှယ်လောင်းအသစ်တစ်ဦးကို ({settings.defaultReplacementCostMmk} MMK) ဖြင့် အစားထိုးပေးပါမည်။
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-semibold">4. Effective Date / စတင်အသက်ဝင်မည့်ရက်</h2>
        <p className="text-sm">This contract is effective as of {today}.</p>
      </section>

      <div className="grid grid-cols-2 gap-8 pt-10 text-sm">
        <div>
          <p className="mb-12 border-b border-black">&nbsp;</p>
          <p>Lion Jobs Agency — Signature / လက်မှတ်</p>
        </div>
        <div>
          <p className="mb-12 border-b border-black">&nbsp;</p>
          <p>{company.name} — Signature / လက်မှတ်</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the auto-print client component**

```typescript
'use client';

import { useEffect } from 'react';

export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
```

- [ ] **Step 3: Write the print page (server component)**

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect, notFound } from 'next/navigation';
import { getCompanyById, getAgencySettings } from '@/lib/db';
import { ContractDocument } from '@/components/legal/ContractDocument';
import { AutoPrint } from '@/components/legal/AutoPrint';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'lionzawlwin@gmail.com';

export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.email !== ADMIN_EMAIL) {
    redirect('/login');
  }

  const { companyId } = await params;
  const [company, settings] = await Promise.all([
    getCompanyById(companyId),
    getAgencySettings(),
  ]);

  if (!company) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden p-4">
        <Link href="/dashboard" className="flex w-fit items-center gap-1.5 text-sm text-gray-600 hover:text-black">
          <ArrowLeft size={14} /> Back to dashboard
        </Link>
      </div>
      <ContractDocument company={company} settings={settings} />
      <AutoPrint />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, log in as the admin email, open the Legal tab, click "Print Contract" on any company row. Expected: a new tab opens showing the bilingual document with no site nav/footer, and the browser print dialog opens automatically after ~300ms. Cancel the print dialog and confirm the commission rate shown matches that company's override (or the global default if none is set).

- [ ] **Step 6: Commit**

```bash
git add src/components/legal/ContractDocument.tsx src/components/legal/AutoPrint.tsx src/app/dashboard/legal/contract/[companyId]/print/page.tsx
git commit -m "feat(legal): add bilingual printable B2B service contract route"
```

---

## Task 13: Candidate Drawer — interview details + consent badge

**Files:**
- Modify: `src/components/dashboard/CandidateDrawer.tsx`

- [ ] **Step 1: Add state for the interview-details form and consent badge**

In `src/components/dashboard/CandidateDrawer.tsx`, add near the existing `cvUrlEdit`/`cvUrlValue`/`savingCvUrl` state (around line 61-63):

```typescript
  const [interviewEditMode,     setInterviewEditMode]     = useState(false);
  const [interviewLocationVal,  setInterviewLocationVal]  = useState('');
  const [interviewerContactVal, setInterviewerContactVal] = useState('');
  const [savingInterview,       setSavingInterview]       = useState(false);
  const { data: consentData } = useSWR<{ consent: { agreedAt: string; termsVersion: string } | null }>(
    candidate && candidate.stage === 'Interview' ? `/api/candidates/${candidate.id}/consent` : null,
    fetcher,
  );
```

- [ ] **Step 2: Reset the interview-details inputs when the drawer opens for a new candidate**

In the existing `useEffect` that resets `cvUrlValue` etc. when `candidate` changes (around line 72-93), add these two lines alongside `setCvUrlValue(candidate.cvUrl ?? '');`:

```typescript
      setInterviewLocationVal(candidate.interviewLocation ?? '');
      setInterviewerContactVal(candidate.interviewerContact ?? '');
      setInterviewEditMode(false);
```

- [ ] **Step 3: Add the save handler**

Add near the existing `handleSaveCvUrl` function:

```typescript
  async function handleSaveInterviewDetails() {
    if (!candidate) return;
    setSavingInterview(true);
    try {
      const res = await fetch(`/api/candidates/${candidate.id}/interview`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          interviewLocation:  interviewLocationVal,
          interviewerContact: interviewerContactVal,
        }),
      });
      if (res.ok) {
        globalMutate('/api/candidates');
        setInterviewEditMode(false);
      }
    } catch (err) { console.error('[CandidateDrawer] interview details update error:', err); }
    finally { setSavingInterview(false); }
  }
```

- [ ] **Step 4: Render the interview-details section, gated to the Interview stage**

Add this block right after the existing `{candidate.interviewDate && (...)}` block (the one ending around line 421):

```typescript
            {candidate.stage === 'Interview' && (
              <div className="space-y-2 px-4 py-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Interview Details</p>
                  {consentData?.consent ? (
                    <span className="text-[10px] font-semibold text-emerald-600">
                      Anti-bypass consent: Agreed {new Date(consentData.consent.agreedAt).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600">Anti-bypass consent: Not yet agreed</span>
                  )}
                </div>
                {interviewEditMode ? (
                  <>
                    <input
                      value={interviewLocationVal}
                      onChange={(e) => setInterviewLocationVal(e.target.value)}
                      placeholder="Interview location"
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <input
                      value={interviewerContactVal}
                      onChange={(e) => setInterviewerContactVal(e.target.value)}
                      placeholder="Interviewer contact"
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveInterviewDetails}
                        disabled={savingInterview}
                        className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {savingInterview ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setInterviewEditMode(false)}
                        className="rounded-lg border border-border px-3 py-1 text-xs text-muted-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setInterviewEditMode(true)}
                    className="text-left text-xs text-muted-foreground hover:text-foreground"
                  >
                    {candidate.interviewLocation
                      ? <>📍 {candidate.interviewLocation}{candidate.interviewerContact ? ` · ${candidate.interviewerContact}` : ''} (edit)</>
                      : 'Set interview location + interviewer contact'}
                  </button>
                )}
              </div>
            )}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Run: `npm run dev`, open a candidate in the Kanban/table, move them to Interview stage, open the drawer, set an interview location, save, reopen the drawer and confirm it persisted and the consent badge shows "Not yet agreed".

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/CandidateDrawer.tsx
git commit -m "feat(dashboard): add interview details form and consent badge to Candidate Drawer"
```

---

## Task 14: Anti-bypass consent modal + `/my-applications` gating

**Files:**
- Create: `src/components/apply/AntiBypassConsentModal.tsx`
- Modify: `src/components/apply/MyApplicationsClient.tsx`

- [ ] **Step 1: Write the consent modal**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import type { AgencySettings } from '@/types';

interface Props {
  applicationId: string;
  onClose: () => void;
  onAgreed: () => void;
}

export function AntiBypassConsentModal({ applicationId, onClose, onAgreed }: Props) {
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [agreed, setAgreed]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch('/api/legal/settings').then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!agreed) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/candidates/${applicationId}/consent`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        return;
      }
      onAgreed();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-background p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <ShieldAlert size={18} className="text-amber-600" /> Anti-Bypass Agreement
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {!settings ? (
          <p className="text-sm text-muted-foreground">Loading terms…</p>
        ) : (
          <div className="space-y-3 text-sm text-foreground">
            <p>
              Before viewing your interview details, please read and agree to the following terms.
              <br />
              အင်တာဗျူးအချက်အလက်များကို ကြည့်ရှုမီ အောက်ပါစည်းကမ်းချက်များကို ဖတ်ရှု သဘောတူပေးပါ။
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                You agree not to join the introduced company directly, bypassing Lion Jobs Agency, for {settings.antiBypassRestrictionMonths} months from your interview date.
                <br />
                အင်တာဗျူးရက်မှ {settings.antiBypassRestrictionMonths} လအတွင်း Lion Jobs Agency မပါဘဲ ဤကုမ္ပဏီတွင် တိုက်ရိုက်ဝင်ရောက်အလုပ်လုပ်ခြင်း မပြုပါ။
              </li>
              <li>
                If the company contacts you directly, you must notify Lion Jobs Agency within 24 hours.
                <br />
                ကုမ္ပဏီမှ တိုက်ရိုက်ဆက်သွယ်လာပါက ၂၄ နာရီအတွင်း Lion Jobs Agency ကို အသိပေးရမည်။
              </li>
              <li>
                Violating this agreement results in a permanent ban from the Lion Jobs Agency ecosystem and liquidated damages of {settings.antiBypassPenaltyMmk.toLocaleString()} MMK.
                <br />
                စည်းကမ်းချိုးဖောက်ပါက Lion Jobs Agency စနစ်တစ်ခုလုံးမှ အပြီးအပိုင် ပိတ်ပင်ခံရပြီး လျော်ကြေးငွေ {settings.antiBypassPenaltyMmk.toLocaleString()} MMK ပေးဆောင်ရမည်။
              </li>
            </ul>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <label className="flex items-start gap-2 pt-2 text-sm font-medium">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
              I have read and agree to these terms. / ကျွန်ုပ်သည် ဖတ်ရှုပြီး သဘောတူပါသည်။
            </label>

            <button
              onClick={handleSubmit}
              disabled={!agreed || submitting}
              className="w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'I Agree — View Interview Details'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire the modal into `MyApplicationsClient.tsx`**

Extend the `ApplicationRecord` interface (top of `src/components/apply/MyApplicationsClient.tsx`) from:

```typescript
interface ApplicationRecord {
  id: string;
  name: string;
  position: string;
  company: string;
  stage: string;
  appliedAt: string;
  stageUpdatedAt: string;
}
```

to:

```typescript
interface ApplicationRecord {
  id: string;
  name: string;
  position: string;
  company: string;
  stage: string;
  appliedAt: string;
  stageUpdatedAt: string;
  needsConsent?: boolean;
  interviewLocation?: string;
  interviewerContact?: string;
}
```

Add the import at the top:

```typescript
import { AntiBypassConsentModal } from './AntiBypassConsentModal';
```

Add state inside `MyApplicationsClient`, alongside the existing `useState` calls:

```typescript
  const [consentTarget, setConsentTarget] = useState<string | null>(null);
```

Update the `res.json()` handling — the API now returns `{ results }` where results carry the new fields, and the `handleCheck` function already does `setResults(data.results ?? [])`, so no change is needed there.

In the results-rendering `<li>` block, after the existing `<div className="mt-3 flex gap-4 ...">Applied/Updated</div>` block, add:

```typescript
                {r.stage === 'Interview' && (
                  <div className="mt-3 border-t border-border/50 pt-3 text-xs">
                    {r.needsConsent ? (
                      <button
                        onClick={() => setConsentTarget(r.id)}
                        className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                      >
                        View Interview Details
                      </button>
                    ) : r.interviewLocation ? (
                      <p className="text-muted-foreground">
                        📍 {r.interviewLocation}{r.interviewerContact ? ` · ${r.interviewerContact}` : ''}
                      </p>
                    ) : null}
                  </div>
                )}
```

Add the modal render at the end of the component's returned JSX, just before the final closing `</div>`:

```typescript
      {consentTarget && (
        <AntiBypassConsentModal
          applicationId={consentTarget}
          onClose={() => setConsentTarget(null)}
          onAgreed={() => { setConsentTarget(null); handleCheck(); }}
        />
      )}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

With a candidate at Interview stage and `interview_location` set (from Task 13's verification), search for them on `/my-applications` by email/phone. Expected: "View Interview Details" button appears. Click it, check the agree box, submit. Expected: modal closes and the location/contact render inline. Refresh the page and search again — expected: details show immediately with no modal (consent already recorded).

- [ ] **Step 5: Commit**

```bash
git add src/components/apply/AntiBypassConsentModal.tsx src/components/apply/MyApplicationsClient.tsx
git commit -m "feat(apply): add anti-bypass consent modal gating interview details"
```

---

## Task 15: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: zero errors (warnings acceptable only if they pre-exist on `main` — do not introduce new ones).

- [ ] **Step 3: End-to-end manual walkthrough**

With `npm run dev` running and logged in as the admin email:
1. Legal tab → Agency Settings: change the default commission rate to 55, save, reload the page, confirm it persisted.
2. Legal tab → B2B Service Contracts: set a per-company override of 65% on one company, print its contract, confirm the printed document shows 65% (not the 55% default) and the correct guarantee/replacement text.
3. Legal tab → B2B Service Contracts: print a company with **no** override set, confirm it shows the 55% default.
4. Candidates tab: move a candidate to Interview stage, open the drawer, set interview location + interviewer contact.
5. Log out (or open an incognito window), go to `/my-applications`, search that candidate by email/phone, click "View Interview Details", agree to the terms, confirm the location/contact reveal.
6. Back in the dashboard as admin, reopen that candidate's drawer, confirm the badge now reads "Anti-bypass consent: Agreed {today's date}".

- [ ] **Step 4: Final commit (if any fixes were needed during verification)**

```bash
git add -A
git commit -m "fix: address issues found during legal docs subsystem verification"
```

(Skip this step if Steps 1-3 passed with no changes needed.)
