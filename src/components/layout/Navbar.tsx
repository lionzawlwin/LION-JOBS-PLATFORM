'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Briefcase, Menu, X, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WHATSAPP = 'https://wa.me/959979333333';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Briefcase size={16} />
          </span>
          <span>Lion <span className="text-brand-600">Jobs</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 md:flex">
          <Link href="/#jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Find Jobs
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors dark:border-green-700/30 dark:bg-green-900/20 dark:text-green-400"
          >
            <MessageCircle size={14} /> WhatsApp
          </a>
          <Link
            href="/#jobs"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-brand-600 hover:bg-brand-700 text-white rounded-xl')}
          >
            Browse Jobs
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            <Link href="/#jobs" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Find Jobs
            </Link>
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              Dashboard
            </Link>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-green-600 hover:bg-green-50 flex items-center gap-2"
            >
              <MessageCircle size={15} /> Chat on WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
