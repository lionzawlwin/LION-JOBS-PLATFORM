'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X, Search, Building2 } from 'lucide-react';
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
  /** 'rail' = persistent desktop sidebar with collapse/expand.
   *  'drawer' = full mobile overlay panel with a close button instead —
   *  collapsing to an icon-only rail doesn't make sense in a full-screen
   *  drawer, so the two variants intentionally render different chrome. */
  variant?: 'rail' | 'drawer';
  onClose?: () => void;
}

export function Sidebar({ tabs, activeTab, onSelect, variant = 'rail', onClose }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const isDrawer = variant === 'drawer';

  // Same pattern as LanguageContext's persisted toggle: default first,
  // then read localStorage in an effect (avoids SSR/client hydration
  // mismatch — localStorage doesn't exist on the server). Collapse state
  // is a rail-only concept; the drawer variant never reads/writes it.
  useEffect(() => {
    if (isDrawer) return;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'true') setCollapsed(true);
  }, [isDrawer]);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const collapsedRail = !isDrawer && collapsed;

  return (
    <aside
      className={cn(
        'flex h-full flex-col gap-1 border-border bg-background p-3 transition-all',
        isDrawer
          ? 'w-72 max-w-[85vw] border-r shadow-2xl'
          : cn('sticky top-6 h-fit rounded-xl border p-2', collapsedRail ? 'w-16' : 'w-56'),
      )}
    >
      {isDrawer && (
        <div className="mb-2 flex items-center justify-between border-b border-border pb-3">
          <span className="text-sm font-bold text-foreground">Menu</span>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onSelect(tab.value)}
            title={collapsedRail ? tab.label : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              collapsedRail ? 'justify-center' : 'justify-start',
              activeTab === tab.value
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-600/15 dark:text-brand-300'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {tab.icon}
            {!collapsedRail && <span className="truncate">{tab.label}</span>}
          </button>
        ))}
      </nav>

      {/* Cross-portal navigation — jump to the public candidate/company
          sites without leaving the admin session. Not gated by role: these
          are just links to already-public pages, no access-control
          implication in surfacing them to every dashboard role. */}
      {(!collapsedRail) && (
        <div className="mt-2 space-y-1 border-t border-border pt-3">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Portals
          </p>
          <Link
            href="/candidate"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Search size={16} /> Candidate Portal
          </Link>
          <Link
            href="/company"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Building2 size={16} /> Company Portal
          </Link>
        </div>
      )}

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
