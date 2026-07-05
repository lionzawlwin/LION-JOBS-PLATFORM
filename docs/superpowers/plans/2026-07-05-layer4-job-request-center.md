# Layer 4: Job Posting Request Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Company Portal users submit a job posting request instead of going through WhatsApp/email/a CSE; every request requires staff review and approval before it becomes a live listing on the public job board — no tier gets auto-publish (repo owner decision, 2026-07-05).

**Architecture:** A new `job_requests` table, deliberately separate from `jobs` (keeps the public job-listing query untouched). Company Portal gets a submit form + status list (`POST`/`GET /api/company-portal/job-requests`, session-authenticated via the existing `getPortalSubjectId('company')`). Staff get a small review panel on the existing Manage Jobs tab (`GET /api/job-requests`, `PATCH /api/job-requests/[id]`, gated by the existing `manage-jobs` RBAC cell — no new tab, no new permission cell). Approving a request calls the existing `appendJob()` (same path the Post Job form uses) so the created job is indistinguishable from a staff-authored one, then marks the request `Approved`. Both directions get a best-effort Resend email notification, matching every other portal email in this codebase.

**Tech Stack:** Next.js 16 Route Handlers, Supabase (service-role client), zod validation, SWR (staff-side hook), Resend (email), i18n (`en`/`my`) for the staff-side panel — matching `JobsPanel.tsx`'s existing convention on the same tab.

**Explicitly out of scope, deferred to a separate plan:** the "Request Center" general-purpose `company_messages` contact-form/inbox described as the other half of Layer 4 in `docs/superpowers/specs/2026-07-05-layer4-job-request-center-design.md`. It has no open business decision blocking it (unlike the job-request workflow question this plan resolves) and is independently useful — ships faster and reviews more easily as its own plan rather than being bundled into this one.

---

### Task 1: Migration — `job_requests` table + types

**Files:**
- Create: `supabase/migrations/0022_add_job_requests.sql`
- Modify: `supabase/MIGRATIONS.md`
- Modify: `src/types/index.ts` (append after `AuditLogEntry`, end of file)

- [ ] **Step 1: Write the migration**

```sql
-- Layer 4 of the Company Dashboard roadmap: job_requests table. Company
-- Portal users submit a job posting request instead of writing directly
-- to the public `jobs` table; every request requires staff review before
-- it becomes a live listing (repo owner decision, 2026-07-05 -- no tier
-- gets auto-publish). See
-- docs/superpowers/specs/2026-07-05-layer4-job-request-center-design.md.
CREATE TABLE IF NOT EXISTS job_requests (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL REFERENCES companies(id),
  title          TEXT NOT NULL,
  location       TEXT NOT NULL,
  category       TEXT NOT NULL,
  type           TEXT NOT NULL,
  salary_min     INTEGER NOT NULL DEFAULT 0,
  salary_max     INTEGER NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'MMK',
  description    TEXT NOT NULL,
  requirements   TEXT[] NOT NULL DEFAULT '{}',
  status         TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by    TEXT,
  reviewed_at    TIMESTAMPTZ,
  rejection_note TEXT
);
ALTER TABLE job_requests ENABLE ROW LEVEL SECURITY;
-- No policies, matching every other table's service-role-only access
-- pattern (see 0006_enable_staff_rls.sql's precedent).

CREATE INDEX IF NOT EXISTS job_requests_company_idx ON job_requests (company_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS job_requests_status_idx  ON job_requests (status, submitted_at DESC);
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP `apply_migration` tool against project `gthewuhgrnnabyxkozvv`, or `npx supabase db push` if the CLI session is linked. Do not skip verification.

- [ ] **Step 3: Verify live**

Call `list_tables` (Supabase MCP) or an equivalent introspection query and confirm: `job_requests` exists, RLS enabled, columns match exactly, both indexes present, `status` CHECK constraint present.

- [ ] **Step 4: Update `supabase/MIGRATIONS.md`**

Add a row to the numbering table:

```markdown
| `0022_add_job_requests.sql` | 2026-07-05 | `job_requests` table (Company Portal job posting requests, Layer 4). Applied via Supabase MCP `apply_migration`, verified live via `list_tables` (RLS enabled, columns match) and index introspection. |
```

- [ ] **Step 5: Add the types**

Append to `src/types/index.ts`:

```typescript
export type JobRequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface JobRequest {
  id: string;
  companyId: string;
  title: string;
  location: string;
  category: JobCategory;
  type: JobType;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  description: string;
  requirements: string[];
  status: JobRequestStatus;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionNote: string | null;
}
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0022_add_job_requests.sql supabase/MIGRATIONS.md src/types/index.ts
git commit -m "feat: add job_requests table (migration 0022) + JobRequest types"
```

---

### Task 2: DB accessor — `src/lib/db/jobRequests.ts`

**Files:**
- Create: `src/lib/db/jobRequests.ts`
- Modify: `src/lib/db/index.ts`

- [ ] **Step 1: Write the accessor**

```typescript
import { supabase } from '@/lib/supabase';
import { appendJob } from './jobs';
import { getCompanyById } from './companies';
import type { JobRequest, JobRequestStatus, JobCategory, JobType } from '@/types';

function mapToJobRequest(row: Record<string, unknown>): JobRequest {
  return {
    id:            row.id as string,
    companyId:     row.company_id as string,
    title:         row.title as string,
    location:      row.location as string,
    category:      row.category as JobCategory,
    type:          row.type as JobType,
    salaryMin:     row.salary_min as number,
    salaryMax:     row.salary_max as number,
    currency:      row.currency as string,
    description:   row.description as string,
    requirements:  (row.requirements as string[]) ?? [],
    status:        row.status as JobRequestStatus,
    submittedAt:   row.submitted_at as string,
    reviewedBy:    (row.reviewed_by as string | null) ?? null,
    reviewedAt:    (row.reviewed_at as string | null) ?? null,
    rejectionNote: (row.rejection_note as string | null) ?? null,
  };
}

export async function appendJobRequest(data: {
  companyId:    string;
  title:        string;
  location:     string;
  category:     string;
  type:         string;
  salaryMin:    number;
  salaryMax:    number;
  currency:     string;
  description:  string;
  requirements: string[];
}): Promise<string> {
  const id = `jr-${crypto.randomUUID()}`;

  const { error } = await supabase.from('job_requests').insert({
    id,
    company_id:   data.companyId,
    title:        data.title,
    location:     data.location,
    category:     data.category,
    type:         data.type,
    salary_min:   data.salaryMin,
    salary_max:   data.salaryMax,
    currency:     data.currency,
    description:  data.description,
    requirements: data.requirements,
  });

  if (error) throw new Error(`Failed to insert job request: ${error.message}`);
  return id;
}

export async function listJobRequestsForCompany(companyId: string): Promise<JobRequest[]> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[db/jobRequests] listJobRequestsForCompany error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToJobRequest);
}

export async function listPendingJobRequests(): Promise<JobRequest[]> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('status', 'Pending')
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('[db/jobRequests] listPendingJobRequests error:', error.message);
    return [];
  }
  return (data ?? []).map(mapToJobRequest);
}

export async function getJobRequestById(id: string): Promise<JobRequest | null> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[db/jobRequests] getJobRequestById error:', error.message);
    return null;
  }
  if (!data) return null;
  return mapToJobRequest(data);
}

// Approving a request creates the live job (reusing appendJob(), the same
// path the Post Job form uses) then marks the request Approved. Both
// writes happen in this one function so a caller can never mark a request
// Approved without the job actually existing, or vice versa.
export async function approveJobRequest(id: string, reviewedBy: string): Promise<string> {
  const request = await getJobRequestById(id);
  if (!request) throw new Error(`Job request ${id} not found`);
  if (request.status !== 'Pending') throw new Error(`Job request ${id} is not pending`);

  const company = await getCompanyById(request.companyId);
  if (!company) throw new Error(`Company ${request.companyId} not found`);

  const jobId = await appendJob({
    title:        request.title,
    company:      company.name,
    companyId:    request.companyId,
    location:     request.location,
    category:     request.category,
    type:         request.type,
    salaryMin:    request.salaryMin,
    salaryMax:    request.salaryMax,
    currency:     request.currency,
    description:  request.description,
    requirements: request.requirements,
    isUrgent:     false,
    isFeatured:   false,
    benefits:     [],
  });

  const { error } = await supabase
    .from('job_requests')
    .update({ status: 'Approved', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to mark job request approved: ${error.message}`);
  return jobId;
}

export async function rejectJobRequest(id: string, reviewedBy: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('job_requests')
    .update({ status: 'Rejected', reviewed_by: reviewedBy, reviewed_at: new Date().toISOString(), rejection_note: note })
    .eq('id', id);

  if (error) throw new Error(`Failed to reject job request: ${error.message}`);
}
```

- [ ] **Step 2: Re-export from the domain index**

In `src/lib/db/index.ts`, add one line:

```typescript
export * from './jobRequests';
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/jobRequests.ts src/lib/db/index.ts
git commit -m "feat: add job_requests db accessor"
```

---

### Task 3: Portal API — `POST`/`GET /api/company-portal/job-requests`

**Files:**
- Create: `src/app/api/company-portal/job-requests/route.ts`

- [ ] **Step 1: Write the route**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPortalSubjectId } from '@/lib/portalAuth';
import { appendJobRequest, listJobRequestsForCompany } from '@/lib/db';
import { logFailure } from '@/lib/observability';

const CATEGORIES = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'Finance',
  'Operations', 'Customer Service', 'Healthcare', 'Education', 'Other',
] as const;
const TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'] as const;

const schema = z.object({
  title:        z.string().trim().min(2).max(200),
  location:     z.string().trim().min(2).max(200),
  category:     z.enum(CATEGORIES),
  type:         z.enum(TYPES),
  salaryMin:    z.number().min(0).max(1_000_000_000),
  salaryMax:    z.number().min(0).max(1_000_000_000),
  currency:     z.string().trim().min(1).max(10),
  description:  z.string().trim().min(20).max(10_000),
  requirements: z.array(z.string().trim().max(200)).max(50),
});

export async function GET() {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const requests = await listJobRequestsForCompany(companyId);
  return NextResponse.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const companyId = await getPortalSubjectId('company');
  if (!companyId) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const rawBody = await req.json().catch(() => null);
  if (!rawBody) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid job request details.' }, { status: 422 });
  }

  try {
    const id = await appendJobRequest({ companyId, ...parsed.data });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/company-portal/job-requests', message: 'Failed to save job request', error: err });
    return NextResponse.json({ error: 'Failed to submit job request.' }, { status: 502 });
  }
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/company-portal/job-requests
git commit -m "feat: add company portal job-request submit + list routes"
```

---

### Task 4: `portalEmail.ts` — decision notification

**Files:**
- Modify: `src/lib/portalEmail.ts`

- [ ] **Step 1: Add the function**

Append to `src/lib/portalEmail.ts`:

```typescript
// Layer 4 of the Company Dashboard roadmap: notify a company contact when
// staff approve or reject their portal-submitted job request. Same
// graceful-no-op pattern as the other portal emails -- a missing
// RESEND_API_KEY (or any send failure) must never block the approve/reject
// action itself; callers wrap this in try/catch and treat it as best-effort.
export async function sendJobRequestDecisionEmail(opts: {
  to: string;
  companyName: string;
  title: string;
  decision: 'approved' | 'rejected';
  jobUrl?: string;
  rejectionNote?: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn('[portalEmail] RESEND_API_KEY not set — cannot send job request decision email.');
    return;
  }

  const isApproved = opts.decision === 'approved';
  const subject = isApproved
    ? `Your job request "${opts.title}" is now live`
    : `Update on your job request "${opts.title}"`;

  const html = isApproved
    ? `
      <p>Hi ${opts.companyName},</p>
      <p>Your job request for <strong>${opts.title}</strong> has been approved and is now live on the job board.</p>
      <p><a href="${opts.jobUrl ?? SITE_URL}">View the live listing</a></p>
      <p>You can track it any time in your <a href="${SITE_URL}/company/portal">Company Portal</a>.</p>
    `
    : `
      <p>Hi ${opts.companyName},</p>
      <p>Your job request for <strong>${opts.title}</strong> was not approved.</p>
      <p><strong>Reason:</strong> ${opts.rejectionNote ?? 'No reason provided.'}</p>
      <p>You can submit a revised request any time in your <a href="${SITE_URL}/company/portal">Company Portal</a>.</p>
    `;

  await resend.emails.send({ from: FROM, to: opts.to, subject, html });
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/lib/portalEmail.ts
git commit -m "feat: add job request approve/reject notification email"
```

---

### Task 5: Staff API — `GET /api/job-requests`, `PATCH /api/job-requests/[id]`

**Files:**
- Create: `src/app/api/job-requests/route.ts`
- Create: `src/app/api/job-requests/[id]/route.ts`

- [ ] **Step 1: List route**

```typescript
import { NextResponse } from 'next/server';
import { requireTabAccess } from '@/lib/auth';
import { listPendingJobRequests } from '@/lib/db';

export async function GET() {
  if (!(await requireTabAccess('manage-jobs', 'view'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await listPendingJobRequests();
  return NextResponse.json(requests, { headers: { 'Cache-Control': 'no-store' } });
}
```

- [ ] **Step 2: Approve/reject route**

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireTabAccess } from '@/lib/auth';
import { approveJobRequest, rejectJobRequest, getJobRequestById, getCompanyById } from '@/lib/db';
import { logFailure } from '@/lib/observability';
import { logAudit } from '@/lib/audit';
import { sendJobRequestDecisionEmail } from '@/lib/portalEmail';
import { buildJobSlug } from '@/lib/utils';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), rejectionNote: z.string().trim().min(1).max(2000) }),
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireTabAccess('manage-jobs', 'manage'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const rawBody = await req.json().catch(() => null);
  if (!rawBody) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = schema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 422 });
  }

  const request = await getJobRequestById(id);
  if (!request) {
    return NextResponse.json({ error: 'Job request not found.' }, { status: 404 });
  }
  const company = await getCompanyById(request.companyId);

  const session = await getServerSession(authOptions);
  const reviewedBy = session?.user?.email ?? 'unknown';
  const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';

  try {
    if (parsed.data.action === 'approve') {
      const jobId = await approveJobRequest(id, reviewedBy);
      await logAudit({ action: 'update', domain: 'manage-jobs', entityType: 'job_request', entityId: id });
      await logAudit({ action: 'create', domain: 'manage-jobs', entityType: 'job', entityId: jobId });

      if (company?.email) {
        try {
          const jobUrl = `${SITE_URL}/jobs/${buildJobSlug({ id: jobId, title: request.title })}`;
          await sendJobRequestDecisionEmail({
            to: company.email, companyName: company.name, title: request.title,
            decision: 'approved', jobUrl,
          });
        } catch (err) {
          await logFailure({ category: 'other', route: '/api/job-requests/[id]', message: 'Failed to send approval email', error: err, context: { jobRequestId: id } });
        }
      }

      return NextResponse.json({ ok: true, jobId });
    }

    await rejectJobRequest(id, reviewedBy, parsed.data.rejectionNote);
    await logAudit({ action: 'update', domain: 'manage-jobs', entityType: 'job_request', entityId: id });

    if (company?.email) {
      try {
        await sendJobRequestDecisionEmail({
          to: company.email, companyName: company.name, title: request.title,
          decision: 'rejected', rejectionNote: parsed.data.rejectionNote,
        });
      } catch (err) {
        await logFailure({ category: 'other', route: '/api/job-requests/[id]', message: 'Failed to send rejection email', error: err, context: { jobRequestId: id } });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await logFailure({ category: 'other', route: '/api/job-requests/[id]', message: 'Failed to process job request decision', error: err, context: { jobRequestId: id } });
    return NextResponse.json({ error: 'Failed to process job request.' }, { status: 502 });
  }
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/job-requests
git commit -m "feat: add staff job-request review routes (list, approve/reject)"
```

---

### Task 6: i18n keys for the staff-side panel

**Files:**
- Modify: `src/lib/i18n.ts`

Following `JobsPanel.tsx`'s existing convention on the same Manage Jobs tab (i18n, not hardcoded English — unlike `TeamView.tsx`/`PermissionsGrid.tsx`, which are explicitly documented exceptions).

- [ ] **Step 1: Add English keys**

In the `en` section, near the existing `mj_*` keys:

```typescript
    jr_panel_title:              'Job Requests',
    jr_no_requests:               'No pending job requests.',
    jr_approve:                   'Approve',
    jr_reject:                    'Reject',
    jr_reject_note_placeholder:   'Reason for rejection (required)',
    jr_reject_confirm:            'Confirm Reject',
    jr_cancel:                    'Cancel',
    jr_toast_approve_failed:      'Could not approve this job request.',
    jr_toast_approved:            'Job request approved and published.',
    jr_toast_reject_failed:       'Could not reject this job request.',
    jr_toast_rejected:            'Job request rejected.',
    jr_toast_load_failed:         'Failed to load job requests.',
```

- [ ] **Step 2: Add Myanmar keys**

In the `my` section, at the corresponding position:

```typescript
    jr_panel_title:              'အလုပ်တောင်းဆိုမှုများ',
    jr_no_requests:               'စောင့်ဆိုင်းနေသော အလုပ်တောင်းဆိုမှု မရှိပါ။',
    jr_approve:                   'အတည်ပြုမည်',
    jr_reject:                    'ငြင်းပယ်မည်',
    jr_reject_note_placeholder:   'ငြင်းပယ်ရသည့် အကြောင်းရင်း (လိုအပ်သည်)',
    jr_reject_confirm:            'ငြင်းပယ်မှု အတည်ပြုမည်',
    jr_cancel:                    'ပယ်ဖျက်မည်',
    jr_toast_approve_failed:      'ဤအလုပ်တောင်းဆိုမှုကို အတည်မပြုနိုင်ပါ။',
    jr_toast_approved:            'အလုပ်တောင်းဆိုမှုကို အတည်ပြု၍ ထုတ်ပြန်ပြီးပါပြီ။',
    jr_toast_reject_failed:       'ဤအလုပ်တောင်းဆိုမှုကို ငြင်းပယ်၍ မရပါ။',
    jr_toast_rejected:            'အလုပ်တောင်းဆိုမှုကို ငြင်းပယ်လိုက်ပါပြီ။',
    jr_toast_load_failed:         'အလုပ်တောင်းဆိုမှုများကို ဖွင့်၍ မရပါ။',
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat: add jr_* i18n keys for the Job Requests panel"
```

---

### Task 7: `useJobRequests` hook

**Files:**
- Create: `src/hooks/useJobRequests.ts`

- [ ] **Step 1: Write the hook**

```typescript
'use client';

import useSWR from 'swr';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JobRequest } from '@/types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useJobRequests() {
  const { data, error, isLoading, mutate } = useSWR<JobRequest[]>(
    '/api/job-requests',
    fetcher,
    { revalidateOnFocus: false },
  );
  const { t } = useLanguage();

  async function approve(id: string) {
    const res = await fetch(`/api/job-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    });
    if (!res.ok) {
      toast.error(t('jr_toast_approve_failed'));
      return false;
    }
    await mutate();
    toast.success(t('jr_toast_approved'));
    return true;
  }

  async function reject(id: string, rejectionNote: string) {
    const res = await fetch(`/api/job-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectionNote }),
    });
    if (!res.ok) {
      toast.error(t('jr_toast_reject_failed'));
      return false;
    }
    await mutate();
    toast.success(t('jr_toast_rejected'));
    return true;
  }

  return {
    requests: data ?? [],
    loading: isLoading,
    error: error ? t('jr_toast_load_failed') : null,
    approve,
    reject,
  };
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useJobRequests.ts
git commit -m "feat: add useJobRequests hook"
```

---

### Task 8: `JobRequestsPanel.tsx` + wire into Manage Jobs tab

**Files:**
- Create: `src/components/dashboard/JobRequestsPanel.tsx`
- Modify: `src/components/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Write the component**

```typescript
'use client';

import { useState } from 'react';
import { Loader2, Inbox, MapPin, AlertTriangle, Check, X } from 'lucide-react';
import { useJobRequests } from '@/hooks/useJobRequests';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JobRequest } from '@/types';

function JobRequestRow({
  request,
  onApprove,
  onReject,
}: {
  request: JobRequest;
  onApprove: (id: string) => Promise<boolean>;
  onReject: (id: string, note: string) => Promise<boolean>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote]           = useState('');
  const [loading, setLoading]     = useState(false);
  const { t } = useLanguage();

  async function handleApprove() {
    setLoading(true);
    await onApprove(request.id);
    setLoading(false);
  }

  async function handleRejectConfirm() {
    if (!note.trim()) return;
    setLoading(true);
    await onReject(request.id, note.trim());
    setLoading(false);
    setRejecting(false);
    setNote('');
  }

  return (
    <div className="rounded-xl border border-border bg-background">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{request.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={10} /> {request.location}
            </span>
            <span className="text-xs text-muted-foreground">{request.category} · {request.type}</span>
          </div>
        </div>

        {request.salaryMax > 0 && (
          <div className="hidden text-right sm:block">
            <p className="text-xs font-semibold text-foreground">
              {request.salaryMin > 0 ? `${request.salaryMin.toLocaleString()} – ` : ''}
              {request.salaryMax.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">{request.currency}</p>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={loading || rejecting}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 dark:border-emerald-700/30 dark:bg-emerald-900/20 dark:text-emerald-300"
          >
            {loading && !rejecting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {t('jr_approve')}
          </button>
          <button
            onClick={() => setRejecting((v) => !v)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 dark:border-red-700/30 dark:bg-red-900/20 dark:text-red-300"
          >
            <X size={12} /> {t('jr_reject')}
          </button>
        </div>
      </div>

      {rejecting && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('jr_reject_note_placeholder')}
            className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground"
          />
          <button
            onClick={handleRejectConfirm}
            disabled={loading || !note.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : t('jr_reject_confirm')}
          </button>
          <button
            onClick={() => { setRejecting(false); setNote(''); }}
            disabled={loading}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t('jr_cancel')}
          </button>
        </div>
      )}
    </div>
  );
}

export function JobRequestsPanel() {
  const { requests, loading, error, approve, reject } = useJobRequests();
  const { t } = useLanguage();

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
        <Inbox size={15} /> {t('jr_panel_title')} {requests.length > 0 && `(${requests.length})`}
      </h3>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <AlertTriangle size={24} className="text-red-500/60" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : requests.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t('jr_no_requests')}</p>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <JobRequestRow key={r.id} request={r} onApprove={approve} onReject={reject} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `DashboardClient.tsx`**

Add the import near the existing `JobsPanel` import:

```typescript
import { JobsPanel } from './JobsPanel';
import { JobRequestsPanel } from './JobRequestsPanel';
```

Render it above `JobsPanel` on the same tab:

```typescript
      {activeTab === 'manage-jobs' && <JobRequestsPanel />}
      {activeTab === 'manage-jobs' && <JobsPanel />}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/JobRequestsPanel.tsx src/components/dashboard/DashboardClient.tsx
git commit -m "feat: add Job Requests review panel to Manage Jobs tab"
```

---

### Task 9: Portal UI — submit form + status list

**Files:**
- Modify: `src/components/portal/CompanyPortalClientImpl.tsx`

- [ ] **Step 1: Replace the full file**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building2, Briefcase, FileText, FileSignature, LogOut, MapPin, Send, Inbox } from 'lucide-react';

interface JobSummary {
  id: string;
  title: string;
  location: string;
  category: string;
  type: string;
  postedAt: string;
  applicantCounts: { Applied: number; Shortlisted: number; Interview: number; Hired: number };
}

interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  position: string;
  agreedSalary: number;
  commissionFeeMmk: number;
  status: string;
  issuedAt: string;
}

interface ContractSummary {
  id: string;
  contractType: string;
  status: string;
  value: number;
  currency: string;
  startDate: string | null;
  endDate: string | null;
}

interface JobRequestSummary {
  id: string;
  title: string;
  location: string;
  type: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionNote: string | null;
}

interface MeResponse {
  company: { id: string; name: string; industry: string; city: string; tier: string };
  jobs: JobSummary[];
  invoices: InvoiceSummary[];
  contracts: ContractSummary[];
}

const CATEGORIES = [
  'Engineering', 'Design', 'Marketing', 'Sales', 'Finance',
  'Operations', 'Customer Service', 'Healthcare', 'Education', 'Other',
] as const;
const TYPES = ['Full-time', 'Part-time', 'Contract', 'Remote', 'Hybrid'] as const;

const STATUS_STYLES: Record<string, string> = {
  Pending:  'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30',
  Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
  Rejected: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30',
};

const inputCls = 'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600';

function JobRequestForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [form, setForm] = useState({
    title: '', location: '', category: '', type: '',
    salaryMin: '', salaryMax: '', currency: 'MMK', description: '', requirements: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/company-portal/job-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          location: form.location,
          category: form.category,
          type: form.type,
          salaryMin: Number(form.salaryMin) || 0,
          salaryMax: Number(form.salaryMax) || 0,
          currency: form.currency,
          description: form.description,
          requirements: form.requirements.split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: json.error ?? 'Could not submit your request. Please try again.' });
        return;
      }

      setForm({ title: '', location: '', category: '', type: '', salaryMin: '', salaryMax: '', currency: 'MMK', description: '', requirements: '' });
      setMessage({ type: 'success', text: 'Your job request has been submitted for review.' });
      onSubmitted();
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Job title" className={inputCls} />
        <input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className={inputCls} />
        <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
          <option value="" disabled>Category</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
          <option value="" disabled>Job type</option>
          {TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
        </select>
        <input type="number" min={0} value={form.salaryMin} onChange={(e) => setForm({ ...form, salaryMin: e.target.value })} placeholder="Salary min (optional)" className={inputCls} />
        <input type="number" min={0} value={form.salaryMax} onChange={(e) => setForm({ ...form, salaryMax: e.target.value })} placeholder="Salary max (optional)" className={inputCls} />
      </div>
      <textarea required minLength={20} rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Job description (min 20 characters)" className={inputCls} />
      <input value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Requirements, comma-separated (optional)" className={inputCls} />

      {message && (
        <p className={message.type === 'success' ? 'text-xs text-emerald-600' : 'text-xs text-red-600'}>{message.text}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit request
      </button>
    </form>
  );
}

export function CompanyPortalClientImpl() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [jobRequests, setJobRequests] = useState<JobRequestSummary[]>([]);

  const loadJobRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/company-portal/job-requests');
      if (!res.ok) return;
      const json = await res.json();
      setJobRequests(json);
    } catch {
      // best-effort -- the main /me load already surfaces a hard error state
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/company-portal/me');
        if (res.status === 401) { router.replace('/company/portal/login'); return; }
        if (!res.ok) { if (!cancelled) setError(true); return; }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    loadJobRequests();
    return () => { cancelled = true; };
  }, [router, loadJobRequests]);

  async function handleLogout() {
    await fetch('/api/company-portal/logout', { method: 'POST' });
    router.replace('/company/portal/login');
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 size={28} className="animate-spin text-muted-foreground" /></div>;
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">Couldn&apos;t load your portal. Please try signing in again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Building2 size={18} /></span>
            <div>
              <h1 className="text-sm font-bold text-foreground">{data.company.name}</h1>
              <p className="text-xs text-muted-foreground">{data.company.industry} · {data.company.city}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Briefcase size={16} /> Your Open Positions ({data.jobs.length})
          </h2>
          {data.jobs.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No positions found under this account yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{job.title}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {job.location} · {job.type}</p>
                    </div>
                    <div className="flex gap-3 text-center text-xs">
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Applied}</p><p className="text-muted-foreground">Applied</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Shortlisted}</p><p className="text-muted-foreground">Shortlisted</p></div>
                      <div><p className="font-bold text-foreground">{job.applicantCounts.Interview}</p><p className="text-muted-foreground">Interview</p></div>
                      <div><p className="font-bold text-emerald-600">{job.applicantCounts.Hired}</p><p className="text-muted-foreground">Hired</p></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <Inbox size={16} /> Request a New Job
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Submit a job posting request below. Every request is reviewed by our team before it goes live — you&apos;ll be notified by email either way.
          </p>
          <JobRequestForm onSubmitted={loadJobRequests} />

          {jobRequests.length > 0 && (
            <div className="mt-4 space-y-2">
              {jobRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> {r.location} · {r.type}</p>
                    {r.status === 'Rejected' && r.rejectionNote && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">Reason: {r.rejectionNote}</p>
                    )}
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText size={16} /> Invoices ({data.invoices.length})
          </h2>
          {data.invoices.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No invoices issued yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="p-3">Invoice #</th>
                    <th className="p-3">Position</th>
                    <th className="p-3">Fee</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50">
                      <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.position}</td>
                      <td className="p-3">{inv.commissionFeeMmk.toLocaleString()} MMK</td>
                      <td className="p-3">{inv.status}</td>
                      <td className="p-3 text-muted-foreground">{new Date(inv.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
            <FileSignature size={16} /> Contracts ({data.contracts.length})
          </h2>
          {data.contracts.length === 0 ? (
            <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No contracts on file yet.
            </p>
          ) : (
            <div className="space-y-2">
              {data.contracts.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{c.contractType}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      {' – '}
                      {c.endDate ? new Date(c.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'ongoing'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{c.value.toLocaleString()} {c.currency}</p>
                    <p className="text-xs text-muted-foreground">{c.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/portal/CompanyPortalClientImpl.tsx
git commit -m "feat: add job request submit form + status list to Company Portal"
```

---

### Task 10: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all pre-existing tests still pass (this plan adds no new test files — matches this repo's own established convention that DB accessor modules and route handlers aren't unit tested; only pure, unmocked logic modules are, per `CLAUDE.md`'s coverage note. `approveJobRequest`/`rejectJobRequest` are thin DB-orchestration functions in the same category as `auditLog.ts`'s accessor, which also has no dedicated test file).

- [ ] **Step 3: Route-protection CI check**

Run: `node scripts/check-route-protection.mjs`
Expected: `Route-protection check passed` — all 3 new routes (`company-portal/job-requests`, `job-requests`, `job-requests/[id]`) carry a recognised guard (`getPortalSubjectId`/`requireTabAccess`).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: same pre-existing baseline findings as `main` (confirm via `git diff` that no touched file introduced a new lint error), zero new findings in any file this plan touched.

- [ ] **Step 5: Manual spot-check note (cannot be automated from this environment)**

Flag for the repo owner: log in to the Company Portal as a real company, submit a job request, confirm it shows "Pending" in the portal. Then log in to the dashboard as owner/admin, open Manage Jobs, confirm the request appears in the new Job Requests panel, approve it, confirm: (a) the job appears live on the public job board, (b) the portal's request list now shows "Approved", (c) an email arrives (if `RESEND_API_KEY` is configured) or the no-op path is hit gracefully (if not). Repeat with Reject + a rejection note, confirming the note surfaces in the portal.

- [ ] **Step 6: Final commit (if Steps 1-4 required any fixes)**

```bash
git add -A
git commit -m "fix(job-requests): final verification fixes"
```

(Skip this step if Steps 1-4 all passed clean on the first try — nothing to commit.)
