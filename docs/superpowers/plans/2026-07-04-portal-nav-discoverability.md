# Portal Nav Discoverability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the already-working Company Portal and Candidate Portal login pages discoverable from the public site (footer, `/company` hero, `/candidate` hero), and fix one stale link found along the way.

**Architecture:** Three additive `Link`-only edits to existing components — no new components, no data/auth/schema changes, no new dependencies. This repo has no unit-test convention for pure presentational JSX (Vitest is used only for logic-bearing modules like `permissions.ts`/`cseScope.ts`); verification here follows the same pattern Phase 11 (routing/nav) used: `tsc`/`lint` clean, then live verification via the `browse` skill.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, `next/link`.

---

### Task 1: Footer portal login links

**Files:**
- Modify: `src/components/layout/Footer.tsx:128-133`

- [ ] **Step 1: Add the two links to the bottom bar**

Replace:

```tsx
        {/* ── Bottom bar ── */}
        <div className="mt-12 border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© {new Date().getFullYear()} Lion Jobs Agency · Yangon, Myanmar</p>
          <p className="text-white/20">{t('footer_tagline')}</p>
        </div>
```

with:

```tsx
        {/* ── Bottom bar ── */}
        <div className="mt-12 border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/30">
          <p>© {new Date().getFullYear()} Lion Jobs Agency · Yangon, Myanmar</p>
          <p className="flex items-center gap-3">
            <Link href="/company/portal/login" className="hover:text-white/60 transition-colors">
              Employer Login
            </Link>
            <span aria-hidden>·</span>
            <Link href="/candidate/portal/login" className="hover:text-white/60 transition-colors">
              Candidate Login
            </Link>
          </p>
          <p className="text-white/20">{t('footer_tagline')}</p>
        </div>
```

`Link` is already imported at the top of this file (line 3) — no import changes needed.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(nav): add employer/candidate portal login links to footer"
```

---

### Task 2: `/company` hero login link

**Files:**
- Modify: `src/app/company/page.tsx:45-47`

- [ ] **Step 1: Add the login link next to "Back to Job Board"**

Replace:

```tsx
            <Link href="/candidate" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand-200 hover:text-white transition-colors">
              <ArrowLeft size={14} /> Back to Job Board
            </Link>
```

with:

```tsx
            <div className="mb-6 flex items-center justify-between gap-4">
              <Link href="/candidate" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-200 hover:text-white transition-colors">
                <ArrowLeft size={14} /> Back to Job Board
              </Link>
              <Link href="/company/portal/login" className="text-sm font-medium text-brand-200 hover:text-white transition-colors">
                Already a client? Log in
              </Link>
            </div>
```

`Link` and `ArrowLeft` are already imported at the top of this file (lines 2–3) — no import changes needed.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/company/page.tsx
git commit -m "feat(nav): add employer portal login link to /company hero"
```

---

### Task 3: `/candidate` hero login link + stale `/hire-with-us` fix

**Files:**
- Modify: `src/components/landing/HeroSection.tsx:167-198`

- [ ] **Step 1: Fix the stale `/hire-with-us` link and add the candidate portal link**

Replace:

```tsx
        {/* Hire Talent CTA */}
        <motion.div
          custom={6} initial="hidden" animate="show" variants={fadeUp}
          className="mt-4"
        >
          <a href="/hire-with-us" className="group block mx-auto max-w-2xl">
            <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-amber-400/50 dark:border-amber-500/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm px-6 py-5 shadow-lg shadow-amber-500/8 transition-all duration-200 hover:border-amber-500 hover:bg-amber-50/80 dark:hover:bg-amber-600/10 hover:shadow-amber-500/15">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 group-hover:scale-105 transition-all duration-200">
                <Building2 size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">{t('hero_hire_title')}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('hero_hire_sub')}</p>
              </div>
              <ArrowRight size={20} className="shrink-0 text-amber-600 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </a>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          custom={7} initial="hidden" animate="show" variants={fadeUp}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-gold-500" /> 500+ {t('hero_stat_roles')}</span>
          <span className="flex items-center gap-1.5"><Building2 size={13} className="text-gold-500" /> 50+ {t('hero_stat_companies')}</span>
          <span className="flex items-center gap-1.5"><Users size={13} className="text-gold-500" /> {t('hero_stat_free')}</span>
        </motion.div>

      </div>
    </section>
  );
}
```

with:

```tsx
        {/* Hire Talent CTA */}
        <motion.div
          custom={6} initial="hidden" animate="show" variants={fadeUp}
          className="mt-4"
        >
          <Link href="/company" className="group block mx-auto max-w-2xl">
            <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-amber-400/50 dark:border-amber-500/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm px-6 py-5 shadow-lg shadow-amber-500/8 transition-all duration-200 hover:border-amber-500 hover:bg-amber-50/80 dark:hover:bg-amber-600/10 hover:shadow-amber-500/15">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30 group-hover:shadow-amber-500/50 group-hover:scale-105 transition-all duration-200">
                <Building2 size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">{t('hero_hire_title')}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('hero_hire_sub')}</p>
              </div>
              <ArrowRight size={20} className="shrink-0 text-amber-600 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </Link>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          custom={7} initial="hidden" animate="show" variants={fadeUp}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-gold-500" /> 500+ {t('hero_stat_roles')}</span>
          <span className="flex items-center gap-1.5"><Building2 size={13} className="text-gold-500" /> 50+ {t('hero_stat_companies')}</span>
          <span className="flex items-center gap-1.5"><Users size={13} className="text-gold-500" /> {t('hero_stat_free')}</span>
        </motion.div>

        {/* Candidate portal login link */}
        <motion.div
          custom={8} initial="hidden" animate="show" variants={fadeUp}
          className="mt-4"
        >
          <Link href="/candidate/portal/login" className="text-xs font-medium text-muted-foreground hover:text-brand-600 transition-colors">
            Already applied? Track your status →
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
```

`Link` is already imported at the top of this file (line 6) — no import changes needed. Note the `<a href="/hire-with-us">` becomes `<Link href="/company">`, matching the `Link`-based pattern the "Drop CV" CTA card directly above it already uses.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/HeroSection.tsx
git commit -m "feat(nav): add candidate portal login link, fix stale /hire-with-us href"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint the whole repo**

Run: `npm run lint`
Expected: same pre-existing warning/error count as `main` before this branch (no new findings introduced by Tasks 1–3). If unsure of the baseline, run `git stash` and `npm run lint` once on unmodified `main` to compare counts, then `git stash pop`.

- [ ] **Step 2: Live-verify via the `browse` skill**

Use the `browse` skill against the local dev server (`npm run dev`) to confirm, by actually navigating:
- `/` and `/candidate`: footer shows "Employer Login" and "Candidate Login"; clicking each lands on `/company/portal/login` and `/candidate/portal/login` respectively (both render the login form, not a 404/500).
- `/candidate`: the "Already applied? Track your status" link near the trust strip navigates to `/candidate/portal/login`.
- `/candidate`: the "Hire Talent" CTA card now navigates straight to `/company` (no intermediate redirect through `/hire-with-us`).
- `/company`: "Already a client? Log in" navigates to `/company/portal/login`; "Back to Job Board" still navigates to `/candidate`.

- [ ] **Step 3: Update PROGRESS.md**

Add a new section documenting this follow-up (branch, task table, log entries: what was built, that i18n/company_id-FK were confirmed still out of scope, what was live-verified vs. not — following the exact format every other phase in this file uses).

- [ ] **Step 4: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: record portal nav discoverability follow-up in PROGRESS.md"
```
