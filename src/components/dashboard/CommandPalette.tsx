'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, User, Building2, Briefcase, ClipboardList, FileText } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import type { NotificationTargetTab, SearchEntityType } from '@/types';

const TYPE_ICON: Record<SearchEntityType, React.ReactNode> = {
  candidate:   <User size={14} />,
  company:     <Building2 size={14} />,
  job:         <Briefcase size={14} />,
  lead:        <ClipboardList size={14} />,
  job_request: <FileText size={14} />,
};

interface Props {
  onNavigate: (tab: NotificationTargetTab) => void;
}

export function CommandPalette({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useSearch(query);

  // Reset the highlighted row when a new results array lands, via React's
  // "adjust state during render" pattern (comparing against the previous
  // render's results) rather than a useEffect -- setState called directly
  // in the render body re-renders before paint instead of after, and isn't
  // subject to react-hooks/set-state-in-effect (that rule targets effects).
  const [prevResults, setPrevResults] = useState(results);
  if (results !== prevResults) {
    setPrevResults(results);
    setSelected(0);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setQuery('');
  }

  function select(index: number) {
    const result = results[index];
    if (!result) return;
    onNavigate(result.href);
    close();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(selected);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Search size={14} />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-24" onClick={close}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search candidates, companies, jobs, leads…"
            className="w-full bg-transparent text-sm text-foreground outline-none"
          />
          {loading && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
        </div>

        {query.trim().length >= 2 && (
          <ul className="max-h-96 overflow-y-auto p-2">
            {results.length === 0 && !loading ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">No results.</li>
            ) : (
              results.map((r, i) => (
                <li key={`${r.type}-${r.id}`}>
                  <button
                    onClick={() => select(i)}
                    onMouseEnter={() => setSelected(i)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${i === selected ? 'bg-muted' : ''}`}
                  >
                    <span className="text-muted-foreground">{TYPE_ICON[r.type]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{r.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
