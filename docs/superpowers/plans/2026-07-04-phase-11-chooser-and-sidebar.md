# Phase 11: Homepage Chooser Split + Dashboard Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Test/verify cycle**: `npx tsc --noEmit` after every task. `npm test` after any task touching testable logic (Task 8's sidebar collapse-state helper). Live-verify both the Chooser and the Sidebar via the `browse` skill (headless browser) before Task 11's final sign-off — this is UI-surface work; type-checking alone doesn't catch a broken layout.

**Goal:** Implement Phase 11's approved design — `/` becomes a Chooser page routing to `/candidate` (today's homepage, moved) and `/company` (today's `/hire-with-us`, moved); the dashboard's tab-switcher becomes a collapsible left sidebar — per `docs/superpowers/specs/2026-07-04-phase-11-chooser-and-sidebar-design.md`, with all three flagged decisions signed off by the repo owner (candidate page inherits full SEO metadata; dashboard drops the public Navbar/Footer for a minimal bar; `cse` defaults to the Enterprise tab).

---

## File Structure

**Create:**
- `src/app/candidate/page.tsx` — today's homepage, moved
- `src/app/company/page.tsx` — today's `/hire-with-us`, moved
- `src/components/ChooserClient.tsx` — new Chooser page's interactive content
- `src/components/dashboard/Sidebar.tsx` — new collapsible sidebar nav

**Modify:**
- `src/app/page.tsx` — replaced entirely with the new Chooser (thin server component + metadata)
- `next.config.ts` — add `redirects()` for `/hire-with-us` → `/company`
- `src/lib/i18n.ts` — new Chooser keys, plus one existing gap found while touching `Navbar.tsx` (`nav_hire_talent` was hardcoded, never in `t()`)
- `src/components/layout/Navbar.tsx` — `/#jobs` → `/candidate#jobs`, `/hire-with-us` → `/company`, hardcoded "Hire Talent" → `t('nav_hire_talent')`
- `src/components/layout/Footer.tsx` — `home_browse_all_jobs` link target
- `src/components/dashboard/DashboardClient.tsx` — sidebar instead of pill row, `cse` defaults to `enterprise`
- `src/app/dashboard/page.tsx` — drop public `Navbar`/`Footer`, minimal dashboard bar
- `PROGRESS.md` — new Phase 11 section

**Deleted (content moved, not duplicated):**
- Old `src/app/hire-with-us/page.tsx` body — replaced with a one-line redirect config entry (Task 3), not a page component at all

**Untouched by design:**
- `/apply/[jobId]`, `/drop-cv`, `/resume-builder`, `/my-applications`, `/login`, `/jobs/[slug]`, `/companies/[slug]` — no changes
- `src/lib/permissions.ts`, `src/lib/auth.ts` — Phase 4/10 access control untouched
- Every dashboard tab's content component (`AnalyticsOverview`, `CandidateDataTable`, `KanbanBoard`, etc.) — only the nav wrapper around them changes

---

### Task 1: Move homepage to `/candidate`

**Files:**
- Create: `src/app/candidate/page.tsx`

- [ ] **Step 1: Create the new route with today's homepage content**

```tsx
import type { Metadata } from 'next';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { AdminBar } from '@/components/layout/AdminBar';
import { HomeClient } from '@/components/HomeClient';
import { getJobs } from '@/lib/db';

// ISR: Vercel regenerates this page at most once per hour.
// Between revalidations, users get cached HTML — Googlebot included.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Lion Jobs Agency | Find Jobs in Myanmar | အလုပ်အကိုင် ရှာဖွေရာ',
  description:
    "Browse 500+ vetted jobs in Yangon, Mandalay and across Myanmar. " +
    "Free for candidates. Apply in minutes. အလုပ်အကိုင် ရှာဖွေပေးသည်။ " +
    "Myanmar's premier recruitment agency.",
  keywords: [
    'jobs in myanmar', 'jobs in yangon', 'myanmar job agency',
    'အလုပ်အကိုင်', 'ရန်ကုန် အလုပ်', 'lion jobs', 'recruitment myanmar',
  ],
  alternates: {
    canonical: `${process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app'}/candidate`,
  },
  openGraph: {
    title: "Lion Jobs Agency — Myanmar's #1 Job Portal",
    description: 'Browse 500+ vetted jobs in Yangon & beyond. Free for candidates.',
    type: 'website',
    locale: 'my_MM',
    alternateLocale: ['en_US'],
  },
};

export default async function CandidatePage() {
  // Fetched server-side at build / revalidation time.
  const initialJobs = await getJobs();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HomeClient initialJobs={initialJobs} />
      </main>
      <AdminBar />
      <Footer />
    </div>
  );
}
```

This is today's `src/app/page.tsx` verbatim except `alternates.canonical` (now
`/candidate`) and the function name (`HomePage` → `CandidatePage`, cosmetic).
`src/app/page.tsx` itself is **not deleted yet** — Task 5 replaces its
contents with the Chooser. Leaving both to exist briefly mid-plan is fine;
Next.js doesn't route-conflict on this (different paths).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. `/candidate` and `/` both serve the same content at
this point in the plan — expected, resolved in Task 5.

- [ ] **Step 3: Commit**

```bash
git add src/app/candidate/page.tsx
git commit -m "feat(routing): add /candidate route with today's homepage content"
```

---

### Task 2: Move `/hire-with-us` to `/company`

**Files:**
- Create: `src/app/company/page.tsx`

- [ ] **Step 1: Create the new route, fixing the "Back to Job Board" link**

Copy `src/app/hire-with-us/page.tsx`'s full contents to
`src/app/company/page.tsx`, with one change — the "Back to Job Board" link
currently points to `/` (today's homepage); post-split, `/` is the Chooser,
not the job board, so this must point to `/candidate` instead:

Replace:
```tsx
            <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-200 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back to Job Board
            </Link>
```
with:
```tsx
            <Link href="/candidate" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-200 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back to Job Board
            </Link>
```

Everything else in the file (metadata, `WHY_US`, `STATS`, the full JSX body)
is copied unchanged — this task moves the file, it doesn't redesign it.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/company/page.tsx
git commit -m "feat(routing): add /company route with today's hire-with-us content"
```

---

### Task 3: Redirect `/hire-with-us` → `/company`

**Files:**
- Modify: `next.config.ts`
- Delete: `src/app/hire-with-us/page.tsx`

- [ ] **Step 1: Add the redirect**

In `next.config.ts`, add a `redirects()` function to `nextConfig` (this repo
has no existing `redirects()` — this is the first one):

```ts
const nextConfig: NextConfig = {
  // ── Redirects ─────────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: '/hire-with-us',
        destination: '/company',
        permanent: true,
      },
    ];
  },

  // ── Images ────────────────────────────────────────────────────
  images: {
```

(Inserted as the first key in the object, ahead of the existing `images`
block — purely a placement choice, doesn't affect behavior.)

- [ ] **Step 2: Delete the old page file**

The route it served now lives at `/company` (Task 2); the redirect above
handles anyone hitting the old URL. Delete `src/app/hire-with-us/page.tsx`
entirely — if both a redirect rule and a page file exist for the same path,
Next.js's page takes precedence and the redirect never fires.

```bash
rm src/app/hire-with-us/page.tsx
```

If `src/app/hire-with-us/` is now empty, remove the directory too.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git add -u src/app/hire-with-us
git commit -m "feat(routing): redirect /hire-with-us to /company"
```

---

### Task 4: Chooser i18n keys (+ one pre-existing gap)

**Files:**
- Modify: `src/lib/i18n.ts`

While wiring `Navbar.tsx`'s links in Task 6, a gap survived Phase 11's
earlier i18n audit: "Hire Talent" (`Navbar.tsx` lines 93 and 155) is
hardcoded, never called through `t()`. Fixing it here since Task 6 touches
those exact lines anyway.

- [ ] **Step 1: Add new keys to the `en` block**

Insert after the most recently added section (find the `footer_tagline`
line and insert immediately after):

```ts
    footer_tagline:                'AI-Powered · Human-Verified · Free for Candidates',

    // Navbar (pre-existing gap, fixed while touching these lines for Phase 11)
    nav_hire_talent: 'Hire Talent',

    // Chooser page
    chooser_headline:       'What brings you to Lion Jobs?',
    chooser_sub:            'Choose your path to get started.',
    chooser_candidate_title: 'Find a Job',
    chooser_candidate_sub:  'Search 500+ vetted roles, apply in minutes, completely free.',
    chooser_company_title:  'Hire Talent',
    chooser_company_sub:    'Get pre-screened, quality candidates matched to your team.',
```

(`chooser_candidate_cta` and `chooser_company_cta` are deliberately not new
keys — reusing existing `nav_browse` ('Browse Jobs') and the new
`nav_hire_talent` respectively, so the Chooser's button text matches the
Navbar's wording exactly.)

- [ ] **Step 2: Add the matching `my` translations**

Find `footer_tagline`'s Myanmar counterpart, insert after it:

```ts
    footer_tagline:                'AI နည်းပညာသုံး · လူဖြင့် စစ်ဆေးအတည်ပြု · လျှောက်ထားသူများအတွက် အခမဲ့',

    // Navbar (pre-existing gap, fixed while touching these lines for Phase 11)
    nav_hire_talent: 'ဝန်ထမ်းငှားရန်',

    // Chooser page
    chooser_headline:       'Lion Jobs သို့ ဘာကြောင့် ရောက်လာတာလဲ?',
    chooser_sub:            'စတင်ရန် သင့်လမ်းကြောင်းကို ရွေးချယ်ပါ။',
    chooser_candidate_title: 'အလုပ်ရှာရန်',
    chooser_candidate_sub:  'အတည်ပြုပြီးသား ရာထူး ၅၀၀+ ကို ရှာဖွေပြီး မိနစ်ပိုင်းအတွင်း အခမဲ့ လျှောက်ထားပါ။',
    chooser_company_title:  'ဝန်ထမ်းငှားရန်',
    chooser_company_sub:    'သင့်အဖွဲ့နှင့် ကိုက်ညီသော အရည်အချင်းပြည့်ဝသော ကိုယ်စားလှယ်လောင်းများကို ရယူပါ။',
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (New keys aren't referenced by any component yet —
this just confirms `en`/`my` still satisfy `Record<Lang, Record<string,
string>>` with matching shapes.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): add Chooser page keys, fix pre-existing nav_hire_talent gap"
```

---

### Task 5: Build the Chooser (`ChooserClient.tsx` + new `src/app/page.tsx`)

**Files:**
- Create: `src/components/ChooserClient.tsx`
- Modify: `src/app/page.tsx` (full replacement)

- [ ] **Step 1: Create the interactive Chooser component**

```tsx
'use client';

import Link from 'next/link';
import { Search, Building2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ChooserClient() {
  const { t, toggleLang } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-16">
      {/* Language toggle, top-right */}
      <button
        aria-label="Switch language"
        onClick={toggleLang}
        className="absolute right-4 top-4 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:right-6 sm:top-6"
      >
        {t('nav_lang_toggle')}
      </button>

      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2.5 font-bold text-2xl text-foreground">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/30 text-lg">
          🦁
        </div>
        <span>
          Lion{' '}
          <span className="bg-gradient-to-r from-brand-600 to-gold-500 bg-clip-text text-transparent">
            Jobs
          </span>
        </span>
      </Link>

      {/* Headline */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
          {t('chooser_headline')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('chooser_sub')}
        </p>
      </div>

      {/* Choice cards */}
      <div className="grid w-full max-w-2xl gap-5 sm:grid-cols-2">
        <Link
          href="/candidate"
          className="group flex flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-brand-300"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-600/10">
            <Search size={26} />
          </div>
          <h2 className="text-lg font-bold text-foreground">{t('chooser_candidate_title')}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t('chooser_candidate_sub')}</p>
          <span className="mt-5 flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-all group-hover:gap-2.5 group-hover:bg-brand-700">
            {t('nav_browse')} <ArrowRight size={14} />
          </span>
        </Link>

        <Link
          href="/company"
          className="group flex flex-col items-center rounded-3xl border border-border bg-card p-8 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:border-gold-300"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 dark:bg-gold-500/10">
            <Building2 size={26} />
          </div>
          <h2 className="text-lg font-bold text-foreground">{t('chooser_company_title')}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t('chooser_company_sub')}</p>
          <span className="mt-5 flex items-center gap-1.5 rounded-xl bg-gold-500 px-5 py-2.5 text-sm font-bold text-white transition-all group-hover:gap-2.5 group-hover:bg-gold-600">
            {t('nav_hire_talent')} <ArrowRight size={14} />
          </span>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `src/app/page.tsx` with the Chooser**

Full replacement:

```tsx
import type { Metadata } from 'next';
import { ChooserClient } from '@/components/ChooserClient';

export const metadata: Metadata = {
  title: 'Lion Jobs Agency — Find Jobs or Hire Talent in Myanmar',
  description:
    "Myanmar's premier recruitment agency. Job seekers browse 500+ vetted " +
    'roles for free. Employers get pre-screened candidates fast.',
  alternates: {
    canonical: `${process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app'}/`,
  },
  openGraph: {
    title: 'Lion Jobs Agency',
    description: "Myanmar's premier recruitment agency — for candidates and employers.",
    type: 'website',
  },
};

export default function ChooserPage() {
  return <ChooserClient />;
}
```

This deliberately has no `Navbar`/`Footer` (per the spec — a neutral
chooser, not another content page) and no data fetching (`getJobs()` moved
to `/candidate` with the rest of that page's content in Task 1).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ChooserClient.tsx src/app/page.tsx
git commit -m "feat(routing): replace homepage with Chooser, candidate/company split live"
```

---

### Task 6: Update `Navbar.tsx` links

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

- [ ] **Step 1: Desktop nav — "Find Jobs" link**

Replace:
```tsx
          <Link href="/#jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:text-brand-600">
            {t('nav_find_jobs')}
          </Link>
```
with:
```tsx
          <Link href="/candidate#jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:text-brand-600">
            {t('nav_find_jobs')}
          </Link>
```

- [ ] **Step 2: Desktop nav — "Hire Talent" button (link + hardcoded text)**

Replace:
```tsx
          <Link
            href="/hire-with-us"
            className={cn(buttonVariants({ size: 'sm' }), 'border border-gold-300 bg-gold-50 text-gold-700 hover:bg-gold-100 dark:border-gold-600/40 dark:bg-gold-500/10 dark:text-gold-300 dark:hover:bg-gold-500/20 rounded-xl gap-1.5')}
          >
            <Building2 size={14} /> Hire Talent
          </Link>
```
with:
```tsx
          <Link
            href="/company"
            className={cn(buttonVariants({ size: 'sm' }), 'border border-gold-300 bg-gold-50 text-gold-700 hover:bg-gold-100 dark:border-gold-600/40 dark:bg-gold-500/10 dark:text-gold-300 dark:hover:bg-gold-500/20 rounded-xl gap-1.5')}
          >
            <Building2 size={14} /> {t('nav_hire_talent')}
          </Link>
```

- [ ] **Step 3: Desktop nav — "Browse Jobs" primary CTA**

Replace:
```tsx
          <Link
            href="/#jobs"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-600/25 hover:shadow-brand-600/40 transition-shadow')}
          >
            {t('nav_browse')}
          </Link>
```
with:
```tsx
          <Link
            href="/candidate#jobs"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-600/25 hover:shadow-brand-600/40 transition-shadow')}
          >
            {t('nav_browse')}
          </Link>
```

- [ ] **Step 4: Mobile menu — "Find Jobs" link**

Replace:
```tsx
            <Link href="/#jobs" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {t('nav_find_jobs')}
            </Link>
```
with:
```tsx
            <Link href="/candidate#jobs" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {t('nav_find_jobs')}
            </Link>
```

- [ ] **Step 5: Mobile menu — "Hire Talent" link (link + hardcoded text)**

Replace:
```tsx
              <Link
                href="/hire-with-us"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-gold-300 bg-gold-50 px-3 py-2.5 text-sm font-semibold text-gold-700 dark:border-gold-600/40 dark:bg-gold-500/10 dark:text-gold-300"
              >
                <Building2 size={15} /> Hire Talent
              </Link>
```
with:
```tsx
              <Link
                href="/company"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-gold-300 bg-gold-50 px-3 py-2.5 text-sm font-semibold text-gold-700 dark:border-gold-600/40 dark:bg-gold-500/10 dark:text-gold-300"
              >
                <Building2 size={15} /> {t('nav_hire_talent')}
              </Link>
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/Navbar.tsx
git commit -m "fix(nav): point Navbar links at /candidate and /company post-split"
```

---

### Task 7: Update `Footer.tsx`'s "Browse All Jobs" link

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 1: Update the quick-link target**

Replace:
```tsx
const QUICK_LINKS: { labelKey: TranslationKey; href: string }[] = [
  { labelKey: 'home_browse_all_jobs', href: '/#jobs' },
```
with:
```tsx
const QUICK_LINKS: { labelKey: TranslationKey; href: string }[] = [
  { labelKey: 'home_browse_all_jobs', href: '/candidate#jobs' },
```

(The other three `QUICK_LINKS` entries — `/drop-cv`, `/resume-builder`,
`/my-applications` — are unaffected by the split, left as-is.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "fix(footer): point Browse All Jobs link at /candidate post-split"
```

---

### Task 8: Build the collapsible `Sidebar.tsx`

**Files:**
- Create: `src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabDomain } from '@/lib/permissions';

const STORAGE_KEY = 'lion_dashboard_sidebar_collapsed';

interface Tab {
  value: TabDomain;
  label: string;
  icon: React.ReactNode;
}

interface Props {
  tabs: Tab[];
  activeTab: TabDomain;
  onSelect: (tab: TabDomain) => void;
}

export function Sidebar({ tabs, activeTab, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  // Same pattern as LanguageContext's persisted toggle: default first,
  // then read localStorage in an effect (avoids SSR/client hydration
  // mismatch — localStorage doesn't exist on the server).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <aside
      className={cn(
        'sticky top-6 flex h-fit shrink-0 flex-col gap-1 rounded-xl border border-border bg-muted/30 p-2 transition-all',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onSelect(tab.value)}
          title={collapsed ? tab.label : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
            collapsed ? 'justify-center' : 'justify-start',
            activeTab === tab.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
          )}
        >
          {tab.icon}
          {!collapsed && <span className="truncate">{tab.label}</span>}
        </button>
      ))}

      <button
        onClick={toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg border-t border-border/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {collapsed ? <ChevronRight size={14} /> : (
          <>
            <ChevronLeft size={14} /> Collapse
          </>
        )}
      </button>
    </aside>
  );
}
```

Mobile behavior (per spec: hamburger-triggered overlay below the `md`
breakpoint) is handled by `DashboardClient.tsx` in Task 9 — `Sidebar.tsx`
itself stays breakpoint-agnostic and is simply hidden/shown by its parent,
matching how `Navbar.tsx`'s existing `menuOpen` mobile drawer is structured
(parent owns the open/closed state, not the nav component itself).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (Not imported anywhere yet — confirms the file is
valid on its own.)

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat(dashboard): add collapsible Sidebar component"
```

---

### Task 9: Wire `Sidebar` into `DashboardClient.tsx`, per-role default tab

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`

- [ ] **Step 1: Import `Sidebar`, add mobile-drawer state**

Replace the import block's tail:
```tsx
import { getAccessLevel, type TabDomain } from '@/lib/permissions';
import type { StaffRole } from '@/types';
```
with:
```tsx
import { getAccessLevel, type TabDomain } from '@/lib/permissions';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import type { StaffRole } from '@/types';
```

- [ ] **Step 2: Per-role default landing tab**

Replace:
```tsx
export function DashboardClient({ isAdmin = false, role }: Props) {
  const [activeTab,   setActiveTab]   = useState<Tab>('overview');
  const [candView,    setCandView]    = useState<'table' | 'board'>('table');
  const { t } = useLanguage();
  const effectiveRole = role ?? 'viewer';
```
with:
```tsx
export function DashboardClient({ isAdmin = false, role }: Props) {
  const effectiveRole = role ?? 'viewer';
  // owner/admin/viewer keep the existing Overview default; cse's actual
  // working domain is Companies/Enterprise/B2B Leads (they have no
  // access to Candidates/Post Job/Content at all), so defaulting them
  // there avoids landing on a tab they'd immediately need to navigate
  // away from. Per Phase 11 spec, signed off by the repo owner.
  const [activeTab,   setActiveTab]   = useState<Tab>(effectiveRole === 'cse' ? 'enterprise' : 'overview');
  const [candView,    setCandView]    = useState<'table' | 'board'>('table');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { t } = useLanguage();
```

(`useState`'s initializer runs once on mount using the `role` prop already
available at that point — no effect needed, unlike the sidebar's
localStorage read which genuinely can't run until the client mounts.)

- [ ] **Step 3: Replace the pill-row tab switcher with the sidebar layout**

Replace:
```tsx
  return (
    <>
      {/* Tab switcher */}
      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Context banner */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
```
with:
```tsx
  return (
    <div className="flex gap-6">
      {/* Sidebar — desktop */}
      <div className="hidden md:block">
        <Sidebar
          tabs={TABS}
          activeTab={activeTab}
          onSelect={setActiveTab}
        />
      </div>

      {/* Sidebar — mobile drawer */}
      <button
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open dashboard navigation"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg md:hidden"
      >
        <Menu size={20} />
      </button>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative">
            <Sidebar
              tabs={TABS}
              activeTab={activeTab}
              onSelect={(tab) => { setActiveTab(tab); setMobileNavOpen(false); }}
            />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1">
      {/* Context banner */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
```

- [ ] **Step 4: Close the new wrapper elements**

Replace the file's closing lines:
```tsx
      {activeTab === 'team'        && <TeamView />}
      {activeTab === 'system-health' && <SystemHealthView />}
    </>
  );
}
```
with:
```tsx
      {activeTab === 'team'        && <TeamView />}
      {activeTab === 'system-health' && <SystemHealthView />}
      </main>
    </div>
  );
}
```

Every `{activeTab === '...' && <View/>}` block between the banner and this
closing tag is otherwise **completely unchanged** — same conditions, same
components, same order.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/DashboardClient.tsx
git commit -m "feat(dashboard): replace pill tab-switcher with collapsible Sidebar"
```

---

### Task 10: Minimal dashboard shell — drop public `Navbar`/`Footer`

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Replace the public Navbar/Footer with a minimal bar**

Replace:
```tsx
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
```
with:
```tsx
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { LayoutDashboard, LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
```

Replace:
```tsx
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-6 sm:py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LayoutDashboard size={20} className="text-brand-600 sm:size-[22px]" />
                <h1 className="text-xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
                {isAdmin && (
                  <span className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300">
                    <Shield size={10} /> {role.charAt(0).toUpperCase() + role.slice(1)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin
                  ? `Signed in as ${session.user?.email} · ${role} access`
                  : 'Track your job applications.'}
              </p>
            </div>

            {/* Sign-out link */}
            <Link
              href="/api/auth/signout"
              className="self-start flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:self-auto"
            >
              <LogOut size={13} /> Sign out
            </Link>
          </div>

          <DashboardClient isAdmin={isAdmin} role={role} />
        </div>
      </main>

      <Footer />
    </div>
  );
```
with:
```tsx
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal dashboard bar — no public nav links (Find Jobs / Hire
          Talent / My Applications don't belong on the internal staff
          tool). Sign-out is the only action a bar needs here. */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-bold text-foreground">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-white text-sm">
              🦁
            </span>
            <span className="hidden sm:inline">Lion Jobs</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-300">
                <Shield size={10} /> {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            )}
            <Link
              href="/api/auth/signout"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut size={13} /> Sign out
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 sm:py-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">

          {/* Page header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2">
              <LayoutDashboard size={20} className="text-brand-600 sm:size-[22px]" />
              <h1 className="text-xl font-bold text-foreground sm:text-3xl">Dashboard</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? `Signed in as ${session.user?.email} · ${role} access`
                : 'Track your job applications.'}
            </p>
          </div>

          <DashboardClient isAdmin={isAdmin} role={role} />
        </div>
      </main>
    </div>
  );
```

Notes on this diff:
- Role badge and sign-out move into the new top bar (still present, just
  relocated — nothing removed).
- Max-width bumped from `max-w-7xl` to `max-w-[1600px]` — the sidebar adds
  a fixed-width column the content area needs to accommodate; this is a
  layout necessity of the sidebar switch, not a separate design decision.
- `Footer` is dropped entirely, not relocated — an admin tool doesn't need
  a marketing footer (contact info, social links, category browse links)
  at all, per the sign-off.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat(dashboard): minimal dashboard-only header, drop public Navbar/Footer"
```

---

### Task 11: Final verification

**Files:** none (read-only verification), plus `PROGRESS.md`

- [ ] **Step 1: Full test run**

Run: `npm test`
Expected: all existing tests pass (no new unit-testable logic was
introduced — `Sidebar.tsx`'s localStorage read/write mirrors
`LanguageContext.tsx`'s already-untested pattern; not a regression).

- [ ] **Step 2: Full type-check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Full lint**

Run: `npx eslint src/app/candidate src/app/company src/app/page.tsx src/app/dashboard src/components/ChooserClient.tsx src/components/dashboard/Sidebar.tsx src/components/dashboard/DashboardClient.tsx src/components/layout/Navbar.tsx src/components/layout/Footer.tsx`
Expected: clean.

- [ ] **Step 4: Live verification via the `browse` skill**

Start the dev server (`npm run dev`), then using the `browse` skill:
- `goto http://localhost:3000/` — confirm the Chooser renders (two cards,
  no job listings, no navbar/footer), confirm the language toggle works.
- Click through to `/candidate` — confirm today's homepage content, job
  search/filter/grid all render exactly as before.
- Click through to `/company` — confirm the hire-with-us content renders,
  confirm "Back to Job Board" goes to `/candidate`.
- `goto http://localhost:3000/hire-with-us` — confirm it redirects to
  `/company`.
- `goto http://localhost:3000/dashboard` (requires a live login — if
  unavailable in this environment, note it as unverified rather than
  skipping silently, same limitation every prior phase's plan has
  recorded) — confirm the sidebar renders instead of the pill row, confirm
  collapse/expand works and persists across reload, confirm the mobile
  hamburger drawer works at a narrow viewport (`browse responsive`).

- [ ] **Step 5: Update `PROGRESS.md`**

Add a new "Phase 11: Homepage Chooser Split + Dashboard Sidebar" section
(root `PROGRESS.md`, same table + log format as Phases 4–10), referencing
this plan and the design spec, and noting: the pre-existing
`nav_hire_talent` i18n gap found and fixed, the SEO-metadata handling
decision, and whether live dashboard verification was actually possible
from this environment.

- [ ] **Step 6: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: record Phase 11 chooser/sidebar completion in PROGRESS.md"
```

- [ ] **Step 7: Push the branch and open a PR (do not merge to main)**

```bash
git push -u origin feat/phase-11-chooser-and-sidebar
gh pr create --title "Phase 11: Homepage chooser split + dashboard sidebar" --body "$(cat <<'EOF'
## Summary
- / becomes a Chooser (two paths: Find a Job / Hire Talent). Today's homepage moves to /candidate; today's /hire-with-us moves to /company (permanent redirect from the old URL).
- Dashboard's horizontal pill tab-switcher replaced with a collapsible left Sidebar. Role-based tab visibility (Phase 4) and data scoping (Phase 10) are completely unchanged -- this is a presentation-layer change only.
- Dashboard shell drops the public Navbar/Footer for a minimal internal bar (role badge + sign-out), per sign-off.
- cse role now defaults to the Enterprise tab instead of Overview, per sign-off.
- Fixed a pre-existing i18n gap found while touching Navbar.tsx: "Hire Talent" was hardcoded, never translated.

## Test plan
- [x] npm test -- all passing
- [x] npx tsc --noEmit -- clean
- [x] npx eslint -- clean
- [x] Verified live via headless browser: Chooser, /candidate, /company, and the /hire-with-us redirect all confirmed working
- [ ] Dashboard sidebar verification requires a live staff login (OAuth-gated) -- confirm collapse/expand and per-role tab visibility post-merge if not verifiable from this environment

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Report the PR URL back once done — **do not merge**.

---

## Self-Review Notes

**Spec coverage:** both signed-off parts are fully covered — Part A
(Tasks 1–7: move, redirect, build Chooser, fix consequential links) and
Part B (Tasks 8–10: build Sidebar, wire it in, minimal shell). All three
flagged decisions from the spec are implemented exactly as signed off
(SEO metadata inheritance in Task 1, dropped Navbar/Footer in Task 10,
`cse` default tab in Task 9's Step 2) — none silently skipped, none
expanded beyond what was approved.

**No orphaned links:** every place that referenced `/#jobs` or
`/hire-with-us` before this plan (`Navbar.tsx` ×4, `Footer.tsx` ×1,
`hire-with-us/page.tsx`'s own back-link) is updated in Tasks 2, 6, and 7 —
verified by having read every hit for both strings across the codebase
before writing this plan, not assumed.

**Access control untouched:** no task in this plan modifies
`src/lib/permissions.ts`, `src/lib/auth.ts`, or any Phase 10 file. The
sidebar renders the exact same `TABS` array `DashboardClient.tsx` already
computes — Task 9's diff only changes how that array is rendered, never
what it contains.

**No placeholders:** every step shows the exact code being added or the
exact existing code being replaced, including full file contents for both
new pages (Tasks 1, 2) and both new components (Tasks 5, 8).
