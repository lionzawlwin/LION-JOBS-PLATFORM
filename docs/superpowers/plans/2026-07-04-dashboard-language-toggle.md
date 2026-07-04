# Dashboard Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a language-toggle button to the Admin Dashboard's `Sidebar.tsx`, so the dashboard chrome can switch between English and Burmese (matching the public site's existing `Navbar.tsx` toggle), without touching any of the 13 tabs' actual content.

**Architecture:** One new button in the shared `Sidebar.tsx` component (used by both the desktop rail and mobile drawer variants), reusing the existing `nav_lang_toggle` i18n key and `useLanguage()`'s `toggleLang()` — no new translation keys, no new files.

**Tech Stack:** Next.js 16, TypeScript, `useLanguage()`/`toggleLang()` from `src/contexts/LanguageContext.tsx`, lucide-react icons.

---

### Task 1: Add the language toggle to `Sidebar.tsx`

**Files:**
- Modify: `src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add imports**

Replace:

```tsx
import { ChevronLeft, ChevronRight, X, Search, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TabDomain } from '@/lib/permissions';
```

with:

```tsx
import { ChevronLeft, ChevronRight, X, Search, Building2, Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { TabDomain } from '@/lib/permissions';
```

- [ ] **Step 2: Add the `useLanguage()` hook call**

Replace:

```tsx
export function Sidebar({ tabs, activeTab, onSelect, variant = 'rail', onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const isDrawer = variant === 'drawer';
```

with:

```tsx
export function Sidebar({ tabs, activeTab, onSelect, variant = 'rail', onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const isDrawer = variant === 'drawer';
  const { t, toggleLang } = useLanguage();
```

- [ ] **Step 3: Add the toggle button above the collapse button**

Replace:

```tsx
      {!isDrawer && (
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
      )}
    </aside>
  );
}
```

with:

```tsx
      <button
        onClick={toggleLang}
        aria-label="Switch language"
        title={collapsedRail ? t('nav_lang_toggle') : undefined}
        className="mt-2 flex items-center justify-center gap-2 rounded-lg border-t border-border/60 px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        {collapsedRail ? <Languages size={14} /> : t('nav_lang_toggle')}
      </button>

      {!isDrawer && (
        <button
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <ChevronLeft size={14} /> Collapse
            </>
          )}
        </button>
      )}
    </aside>
  );
}
```

Note what changed structurally: the new language-toggle button now renders unconditionally (both `rail` and `drawer` variants) and takes over the `mt-2 border-t` separator styling that used to belong to the collapse button — since the collapse button (rail-only) now immediately follows it without needing its own top border/margin. `collapsedRail` is an existing const already computed earlier in this file (`const collapsedRail = !isDrawer && collapsed;`) — reused here, not redefined.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/Sidebar.tsx
git commit -m "feat(dashboard): add language toggle to Sidebar"
```

---

### Task 2: Verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: same pre-existing problem count as `main`'s baseline (28: 17 errors, 11 warnings), none in `Sidebar.tsx`.

- [ ] **Step 2: Run the test suite**

Run: `npm test`
Expected: 58/58 passing (no test touches this file).

- [ ] **Step 3: Live-verify via the `browse` skill**

Start the dev server, log in to `/dashboard` as staff is not possible from this environment (OAuth-gated) — instead, verify by directly rendering the `Sidebar` component's behavior through the public-facing pieces that don't require auth: confirm via code reading and a quick manual trace that `collapsedRail`'s value correctly drives the icon-only branch, since a live authenticated screenshot isn't reachable in this environment. If a staff session IS available (check `.env.local` for whether a real Google OAuth session can be simulated, or ask the repo owner to spot-check), navigate to `/dashboard`, confirm: the toggle appears above "Collapse" in the expanded desktop rail showing `မြန်မာ`/`English` text; clicking it switches the dashboard's tab labels and banner text (already wired via `t()`); collapsing the rail shows the `Languages` icon only, with a hover tooltip; opening the mobile drawer (narrow viewport) shows the same toggle.

- [ ] **Step 4: Update `PROGRESS.md`**

Add a new section (branch `feat/dashboard-language-toggle`) documenting: what was added, that this is explicitly scoped to the toggle only (not tab-content translation, which remains a separate deferred project), and verification results — including an honest note if the live authenticated dashboard check couldn't be performed from this environment (same limitation recorded in prior phases' `PROGRESS.md` entries for OAuth-gated dashboard work).

- [ ] **Step 5: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: record dashboard language toggle in PROGRESS.md"
```
