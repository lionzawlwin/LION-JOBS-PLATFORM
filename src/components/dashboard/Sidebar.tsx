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
