# /company Page Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the 28 repo-owner-supplied Burmese translations into `/company`'s "Why Partner With Us?" section and hiring-request form, leaving every other string on the page in English.

**Architecture:** `company/page.tsx` is a Server Component (exports Next.js `metadata`) so it can't call the client-only `useLanguage()` hook directly. A new Client Component (`WhySection.tsx`) takes over the "Why Us" content; `HireForm.tsx` (already a Client Component) absorbs the moved-in form header and gains `t()` wiring for its Company Info / Contact Person fields.

**Tech Stack:** Next.js 16 App Router, TypeScript, `useLanguage()`/`TranslationKey` from the existing `src/contexts/LanguageContext.tsx` + `src/lib/i18n.ts` i18n system.

---

### Task 1: Add the 28 new i18n keys

**Files:**
- Modify: `src/lib/i18n.ts:715-716` (end of `en` block)
- Modify: `src/lib/i18n.ts:1429-1430` (end of `my` block, line numbers shift by +29 after Task 1's first edit — re-locate by searching for `ec_digest_info_suffix` before editing)

- [ ] **Step 1: Add the English keys**

Find this exact block (currently the last two entries before the `en` object's closing brace):

```ts
    ec_digest_info_prefix: ' Weekly digest auto-sends every ',
    ec_digest_info_suffix: ' to all active companies.',
  },
```

Replace with:

```ts
    ec_digest_info_prefix: ' Weekly digest auto-sends every ',
    ec_digest_info_suffix: ' to all active companies.',

    // Company / Hire page
    hire_page_why_title:              'Why Partner With Us?',
    hire_page_why_desc:               'We take the pain out of hiring. From sourcing to offer — we handle everything, so your team can stay focused on what matters.',
    hire_page_why_prescreened_title:  'Pre-Screened Candidates',
    hire_page_why_prescreened_desc:   'Every candidate is assessed before you ever see their CV. No wasted interviews.',
    hire_page_why_turnaround_title:   'Fast Turnaround',
    hire_page_why_turnaround_desc:    'Receive your shortlist within 3–5 business days of submission.',
    hire_page_why_quality_title:      'Quality Guarantee',
    hire_page_why_quality_desc:       '30-day replacement guarantee if a placed candidate leaves within the period.',
    hire_page_why_expertise_title:    'Industry Expertise',
    hire_page_why_expertise_desc:     'Deep networks across Tech, Finance, Manufacturing, FMCG, and more.',
    hire_page_why_zerocost_title:     'Zero Upfront Cost',
    hire_page_why_zerocost_desc:      'No retainer. You only pay on successful placement.',
    hire_page_why_e2e_title:          'End-to-End Recruitment',
    hire_page_why_e2e_desc:           'We handle sourcing, screening, scheduling, and offer negotiation.',
    hire_form_title:                  'Submit Your Hiring Request',
    hire_form_sub:                    'Complete the form and our team will contact you within 1 business day.',
    hire_form_company_info_title:     'Company Information',
    hire_form_company_info_sub:       'Tell us about your organisation',
    hire_form_company_name:           'Company Name',
    hire_form_industry:               'Industry',
    hire_form_location:               'Location / City',
    hire_form_website:                'Company Website',
    hire_form_contact_title:          'Contact Person',
    hire_form_contact_sub:            'Who should we reach out to?',
    hire_form_full_name:              'Full Name',
    hire_form_job_title:              'Job Title / HR Title',
    hire_form_work_email:             'Work Email',
    hire_form_phone:                  'Phone / WhatsApp',
  },
```

- [ ] **Step 2: Add the Burmese keys**

Find this exact block (currently the last two entries before the `my` object's closing brace — search for `ec_digest_info_suffix` a second time, since Step 1 shifted line numbers):

```ts
    ec_digest_info_prefix: ' အပတ်စဉ် အကျဉ်းချုပ်ကို အသက်ဝင်နေသော ကုမ္ပဏီအားလုံးထံ ',
    ec_digest_info_suffix: ' တိုင်း အလိုအလျောက် ပို့ပါသည်။',
  },
} satisfies Record<Lang, Record<string, string>>;
```

Replace with:

```ts
    ec_digest_info_prefix: ' အပတ်စဉ် အကျဉ်းချုပ်ကို အသက်ဝင်နေသော ကုမ္ပဏီအားလုံးထံ ',
    ec_digest_info_suffix: ' တိုင်း အလိုအလျောက် ပို့ပါသည်။',

    // Company / Hire page
    hire_page_why_title:              'ကျွန်ုပ်တို့နှင့် ဘာကြောင့် လက်တွဲသင့်သလဲ။',
    hire_page_why_desc:               'ဝန်ထမ်းခေါ်ယူခြင်းအတွက် ခေါင်းခဲစရာမလိုတော့ပါ။ လျှောက်ထားသူရှာဖွေခြင်းမှစ၍ အလုပ်ခန့်အပ်သည်အထိ အစအဆုံး တာဝန်ယူဆောင်ရွက်ပေးပါသည်။',
    hire_page_why_prescreened_title:  'ကြိုတင်စိစစ်ထားသော အလုပ်လျှောက်ထားသူများ',
    hire_page_why_prescreened_desc:   'သင့်ထံသို့ CV မပို့မီ လျှောက်ထားသူတိုင်းကို သေချာစွာ အကဲဖြတ်စစ်ဆေးထားပါသည်။',
    hire_page_why_turnaround_title:   'မြန်ဆန်သော ဝန်ဆောင်မှု',
    hire_page_why_turnaround_desc:    'လျှောက်လွှာတင်ပြီး ၃-၅ ရက်အတွင်း ဆန်ခါတင်စာရင်းကို ရရှိနိုင်ပါသည်။',
    hire_page_why_quality_title:      'အရည်အသွေး အာမခံချက်',
    hire_page_why_quality_desc:       'အလုပ်ခန့်အပ်ပြီးနောက် ရက် ၃၀ အတွင်း အလုပ်ထွက်သွားပါက အစားထိုးရှာဖွေပေးမည့် အာမခံ ပါဝင်ပါသည်။',
    hire_page_why_expertise_title:    'လုပ်ငန်းခွင် ကျွမ်းကျင်မှု',
    hire_page_why_expertise_desc:     'နည်းပညာ၊ ဘဏ္ဍာရေး၊ ထုတ်လုပ်ရေး၊ FMCG နှင့် အခြားလုပ်ငန်းနယ်ပယ်များစွာတွင် ကျယ်ပြန့်သော ကွန်ရက်ရှိပါသည်။',
    hire_page_why_zerocost_title:     'ကြိုတင်ငွေ ပေးသွင်းရန်မလို',
    hire_page_why_zerocost_desc:      'လစဉ်ကြေးမရှိပါ။ ဝန်ထမ်းခန့်အပ်မှု အောင်မြင်မှသာ ငွေပေးချေရပါမည်။',
    hire_page_why_e2e_title:          'ပြီးပြည့်စုံသော ဝန်ထမ်းခေါ်ယူမှု',
    hire_page_why_e2e_desc:           'ဝန်ထမ်းရှာဖွေခြင်း၊ စစ်ဆေးခြင်း၊ အင်တာဗျူးချိန်ညှိခြင်းနှင့် လစာညှိနှိုင်းခြင်းများကို ဆောင်ရွက်ပေးပါသည်။',
    hire_form_title:                  'ဝန်ထမ်းခေါ်ယူရန် ဖောင်ဖြည့်ပါ',
    hire_form_sub:                    'အောက်ပါအချက်အလက်များကို ဖြည့်စွက်ပေးပါ။ ကျွန်ုပ်တို့အဖွဲ့မှ ၁ ရက်အတွင်း ဆက်သွယ်ပေးပါမည်။',
    hire_form_company_info_title:     'ကုမ္ပဏီ အချက်အလက်',
    hire_form_company_info_sub:       'သင့်လုပ်ငန်းအကြောင်း မျှဝေပေးပါ',
    hire_form_company_name:           'ကုမ္ပဏီအမည်',
    hire_form_industry:               'လုပ်ငန်းအမျိုးအစား',
    hire_form_location:               'တည်နေရာ / မြို့',
    hire_form_website:                'ကုမ္ပဏီ Website',
    hire_form_contact_title:          'ဆက်သွယ်ရန်ပုဂ္ဂိုလ်',
    hire_form_contact_sub:            'မည်သူ့ထံ ဆက်သွယ်ရမည်နည်း။',
    hire_form_full_name:              'အမည်အပြည့်အစုံ',
    hire_form_job_title:              'ရာထူး / HR ရာထူး',
    hire_form_work_email:             'လုပ်ငန်းသုံး အီးမေးလ်',
    hire_form_phone:                  'ဖုန်းနံပါတ် / WhatsApp',
  },
} satisfies Record<Lang, Record<string, string>>;
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`TranslationKey` is `keyof typeof translations.en` — adding matching keys to both `en` and `my` keeps the `satisfies Record<Lang, Record<string, string>>` constraint happy. If `my` is missing any key `en` has, TypeScript will NOT error since `Record<string, string>` doesn't enforce identical key sets between `en`/`my` — so double-check by eye that both blocks have exactly the same 28 new keys before moving on.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n.ts
git commit -m "feat(i18n): add /company page and hire-form translation keys"
```

---

### Task 2: Extract `WhySection.tsx`

**Files:**
- Create: `src/components/hire/WhySection.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { Users, Clock, Shield, TrendingUp, Star, Briefcase } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TranslationKey } from '@/lib/i18n';

const WHY_US: {
  id: string;
  icon: typeof Users;
  color: string;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}[] = [
  { id: 'prescreened', icon: Users,      color: 'bg-brand-600',   titleKey: 'hire_page_why_prescreened_title', descKey: 'hire_page_why_prescreened_desc' },
  { id: 'turnaround',  icon: Clock,      color: 'bg-amber-500',   titleKey: 'hire_page_why_turnaround_title',  descKey: 'hire_page_why_turnaround_desc' },
  { id: 'quality',     icon: Shield,     color: 'bg-violet-600',  titleKey: 'hire_page_why_quality_title',     descKey: 'hire_page_why_quality_desc' },
  { id: 'expertise',   icon: TrendingUp, color: 'bg-emerald-600', titleKey: 'hire_page_why_expertise_title',   descKey: 'hire_page_why_expertise_desc' },
  { id: 'zerocost',    icon: Star,       color: 'bg-rose-500',    titleKey: 'hire_page_why_zerocost_title',    descKey: 'hire_page_why_zerocost_desc' },
  { id: 'e2e',         icon: Briefcase,  color: 'bg-sky-600',     titleKey: 'hire_page_why_e2e_title',         descKey: 'hire_page_why_e2e_desc' },
];

export function WhySection() {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-extrabold text-foreground">{t('hire_page_why_title')}</h2>
      <p className="mt-2 text-muted-foreground">
        {t('hire_page_why_desc')}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {WHY_US.map(({ id, icon: Icon, color, titleKey, descKey }) => (
          <div key={id} className="flex gap-3 rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{t(titleKey)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{t(descKey)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Note: the original had the heading+paragraph and the card grid as two sibling elements directly inside `company/page.tsx`'s `<div className="space-y-8">` wrapper (which also contains the testimonial and process-steps blocks that stay in `page.tsx`). This component returns both pieces wrapped in one `<div>` — Task 3 renders `<WhySection />` as a direct child of that same `space-y-8` wrapper, so the `mt-8` spacing here replaces the wrapper's original `space-y-8` gap between the heading block and the card grid (they were two separate children before; now they're one). Visually equivalent spacing, confirmed in Task 4's browser check.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/hire/WhySection.tsx
git commit -m "feat(hire): extract WhySection as a client component for i18n"
```

---

### Task 3: Update `company/page.tsx`

**Files:**
- Modify: `src/app/company/page.tsx`

- [ ] **Step 1: Remove unused icon imports, add `WhySection` import**

Replace:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Users, Clock, Shield, Star, TrendingUp, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HireForm } from '@/components/hire/HireForm';
```

with:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { HireForm } from '@/components/hire/HireForm';
import { WhySection } from '@/components/hire/WhySection';
```

- [ ] **Step 2: Remove the `WHY_US` const**

Delete this entire block (it now lives in `WhySection.tsx`):

```tsx
const WHY_US = [
  { icon: Users,      color: 'bg-brand-600',   title: 'Pre-Screened Candidates',  desc: 'Every candidate is assessed before you ever see their CV. No wasted interviews.' },
  { icon: Clock,      color: 'bg-amber-500',   title: 'Fast Turnaround',           desc: 'Receive your shortlist within 3–5 business days of submission.' },
  { icon: Shield,     color: 'bg-violet-600',  title: 'Quality Guarantee',         desc: '30-day replacement guarantee if a placed candidate leaves within the period.' },
  { icon: TrendingUp, color: 'bg-emerald-600', title: 'Industry Expertise',        desc: 'Deep networks across Tech, Finance, Manufacturing, FMCG, and more.' },
  { icon: Star,       color: 'bg-rose-500',    title: 'Zero Upfront Cost',         desc: 'No retainer. You only pay on successful placement.' },
  { icon: Briefcase,  color: 'bg-sky-600',     title: 'End-to-End Recruitment',    desc: 'We handle sourcing, screening, scheduling, and offer negotiation.' },
];

```

(Leave the `STATS` const directly below it untouched — Hero stats stay English/out of scope.)

- [ ] **Step 3: Replace the inline "Why Us" heading/paragraph/cards with `<WhySection />`**

Replace:

```tsx
            {/* Left: Why Us ─────────────────────────────────────── */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold text-foreground">Why Partner With Us?</h2>
                <p className="mt-2 text-muted-foreground">
                  We take the pain out of hiring. From sourcing to offer — we handle everything,
                  so your team can stay focused on what matters.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {WHY_US.map(({ icon: Icon, color, title, desc }) => (
                  <div key={title} className="flex gap-3 rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Testimonial */}
```

with:

```tsx
            {/* Left: Why Us ─────────────────────────────────────── */}
            <div className="space-y-8">
              <WhySection />

              {/* Testimonial */}
```

- [ ] **Step 4: Remove the "Submit Your Hiring Request" header (moved into `HireForm`)**

Replace:

```tsx
            {/* Right: Form ─────────────────────────────────────── */}
            <div>
              <div className="rounded-3xl border border-border bg-card p-8 shadow-lg shadow-black/5">
                <div className="mb-7">
                  <h2 className="text-xl font-extrabold text-foreground">Submit Your Hiring Request</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Complete the form and our team will contact you within 1 business day.
                  </p>
                </div>
                <HireForm />
              </div>
            </div>
```

with:

```tsx
            {/* Right: Form ─────────────────────────────────────── */}
            <div>
              <div className="rounded-3xl border border-border bg-card p-8 shadow-lg shadow-black/5">
                <HireForm />
              </div>
            </div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (confirms `Briefcase`/`Users`/`Clock`/`Shield`/`Star`/`TrendingUp`/`WHY_US` removal left no dangling references — `Briefcase` was only used by the removed `WHY_US` array, not elsewhere in this file).

- [ ] **Step 6: Commit**

```bash
git add src/app/company/page.tsx
git commit -m "feat(company): render WhySection, drop moved-out form header"
```

---

### Task 4: Wire `HireForm.tsx`

**Files:**
- Modify: `src/components/hire/HireForm.tsx`

- [ ] **Step 1: Add the `useLanguage` import and hook call**

Replace:

```tsx
import { Building2, User, Briefcase, ChevronRight, CheckCircle2, Loader2, FileText, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
```

with:

```tsx
import { Building2, User, Briefcase, ChevronRight, CheckCircle2, Loader2, FileText, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
```

Replace:

```tsx
export function HireForm() {
  const [submitted,   setSubmitted]  = useState(false);
```

with:

```tsx
export function HireForm() {
  const { t } = useLanguage();
  const [submitted,   setSubmitted]  = useState(false);
```

- [ ] **Step 2: Add the moved-in header above both the success state and the form**

Replace:

```tsx
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
```

with:

```tsx
  const header = (
    <div className="mb-7">
      <h2 className="text-xl font-extrabold text-foreground">{t('hire_form_title')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('hire_form_sub')}
      </p>
    </div>
  );

  if (submitted) {
    return (
      <>
        {header}
        <div className="flex flex-col items-center justify-center gap-6 py-16 text-center">
```

Then find the closing of that same block:

```tsx
          <div className="rounded-2xl border border-brand-200 bg-brand-50 dark:border-brand-700/30 dark:bg-brand-600/10 px-5 py-3 text-sm font-semibold text-brand-700 dark:text-brand-300">
            ✓ Team Notified via Telegram
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
```

Replace with:

```tsx
          <div className="rounded-2xl border border-brand-200 bg-brand-50 dark:border-brand-700/30 dark:bg-brand-600/10 px-5 py-3 text-sm font-semibold text-brand-700 dark:text-brand-300">
            ✓ Team Notified via Telegram
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
```

- [ ] **Step 3: Close the new fragment at the end of the form**

Replace the final lines of the component:

```tsx
      <p className="text-center text-xs text-muted-foreground">
        🔒 Your information is secure and will only be used to match you with suitable candidates.
        Our team will contact you within 1 business day.
      </p>
    </form>
  );
}
```

with:

```tsx
      <p className="text-center text-xs text-muted-foreground">
        🔒 Your information is secure and will only be used to match you with suitable candidates.
        Our team will contact you within 1 business day.
      </p>
      </form>
    </>
  );
}
```

- [ ] **Step 4: Wire the Company Information section**

Replace:

```tsx
          <div>
            <h3 className="text-sm font-bold text-foreground">Company Information</h3>
            <p className="text-xs text-muted-foreground">Tell us about your organisation</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Company Name <span className="text-red-500">*</span></label>
            <input {...register('companyName')} placeholder="e.g. Acme Corp Ltd" className={inputCls} />
            {errors.companyName && <p className={errorCls}>{errors.companyName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Industry <span className="text-red-500">*</span></label>
            <select {...register('industry')} className={inputCls}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            {errors.industry && <p className={errorCls}>{errors.industry.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Location / City <span className="text-red-500">*</span></label>
            <input {...register('location')} placeholder="e.g. Yangon, Myanmar" className={inputCls} />
            {errors.location && <p className={errorCls}>{errors.location.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Company Website</label>
            <input {...register('website')} placeholder="https://yourcompany.com" className={inputCls} />
          </div>
        </div>
      </div>
```

with:

```tsx
          <div>
            <h3 className="text-sm font-bold text-foreground">{t('hire_form_company_info_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('hire_form_company_info_sub')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_company_name')} <span className="text-red-500">*</span></label>
            <input {...register('companyName')} placeholder="e.g. Acme Corp Ltd" className={inputCls} />
            {errors.companyName && <p className={errorCls}>{errors.companyName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_industry')} <span className="text-red-500">*</span></label>
            <select {...register('industry')} className={inputCls}>
              <option value="">Select industry…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
            {errors.industry && <p className={errorCls}>{errors.industry.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_location')} <span className="text-red-500">*</span></label>
            <input {...register('location')} placeholder="e.g. Yangon, Myanmar" className={inputCls} />
            {errors.location && <p className={errorCls}>{errors.location.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_website')}</label>
            <input {...register('website')} placeholder="https://yourcompany.com" className={inputCls} />
          </div>
        </div>
      </div>
```

(`Select industry…` and the placeholder attributes stay English — not in the approved 28 strings.)

- [ ] **Step 5: Wire the Contact Person section**

Replace:

```tsx
          <div>
            <h3 className="text-sm font-bold text-foreground">Contact Person</h3>
            <p className="text-xs text-muted-foreground">Who should we reach out to?</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Full Name <span className="text-red-500">*</span></label>
            <input {...register('contactName')} placeholder="e.g. Daw Aye Myat" className={inputCls} />
            {errors.contactName && <p className={errorCls}>{errors.contactName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Job Title / HR Title</label>
            <input {...register('contactTitle')} placeholder="e.g. HR Manager" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Work Email <span className="text-red-500">*</span></label>
            <input {...register('workEmail')} type="email" placeholder="hr@company.com" className={inputCls} />
            {errors.workEmail && <p className={errorCls}>{errors.workEmail.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Phone / WhatsApp <span className="text-red-500">*</span></label>
            <input {...register('phone')} placeholder="09428954289" className={inputCls} />
            {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
          </div>
        </div>
      </div>
```

with:

```tsx
          <div>
            <h3 className="text-sm font-bold text-foreground">{t('hire_form_contact_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('hire_form_contact_sub')}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_full_name')} <span className="text-red-500">*</span></label>
            <input {...register('contactName')} placeholder="e.g. Daw Aye Myat" className={inputCls} />
            {errors.contactName && <p className={errorCls}>{errors.contactName.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_job_title')}</label>
            <input {...register('contactTitle')} placeholder="e.g. HR Manager" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_work_email')} <span className="text-red-500">*</span></label>
            <input {...register('workEmail')} type="email" placeholder="hr@company.com" className={inputCls} />
            {errors.workEmail && <p className={errorCls}>{errors.workEmail.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">{t('hire_form_phone')} <span className="text-red-500">*</span></label>
            <input {...register('phone')} placeholder="09428954289" className={inputCls} />
            {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
          </div>
        </div>
      </div>
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. Pay attention to JSX balance from the fragment changes in Steps 2–3 — a mismatched `<>`/`</>` or extra/missing closing `</div>` will surface here as a syntax error.

- [ ] **Step 7: Commit**

```bash
git add src/components/hire/HireForm.tsx
git commit -m "feat(hire-form): wire i18n for header and Company/Contact sections"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: same pre-existing problem count as `main`'s baseline (28: 17 errors, 11 warnings as of this session), none in the 4 touched/created files.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: 58/58 passing (no test touches these files, so this is a no-op confirmation nothing else broke).

- [ ] **Step 3: Live-verify both languages via the `browse` skill**

Start the dev server (`npm run dev`), then using `browse`:
- Navigate to `/company` in English (default). Confirm the page renders normally: "Why Partner With Us?" section with 6 cards, and the "Submit Your Hiring Request" form header still appears above the form (not lost in the refactor).
- Click the language toggle (the `မြန်မာ`/`EN` button in the navbar). Confirm all 28 wired strings switch to the Burmese text from Task 1, and confirm these specific strings do **not** change (still English in `my` mode): the Hero headline "Find the Right Talent for Your Team", the STATS labels ("Placements Made" etc.), the testimonial quote, "Our Simple Process" and its 4 steps, and the Hiring Requisition section's "Job Title / Role" label.
- Confirm the post-submit success state (if reachable without a real submission, skip — otherwise just confirm the header renders correctly above the form in both languages, which is the part Task 4 changed).

- [ ] **Step 4: Update `PROGRESS.md`**

Add a new section (branch `feat/company-page-localization`) documenting: what was wired, the explicit out-of-scope list, and verification results, following this file's established per-phase format.

- [ ] **Step 5: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: record /company page localization in PROGRESS.md"
```
