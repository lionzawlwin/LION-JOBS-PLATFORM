'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Briefcase, Menu, X, Inbox, Building2 } from 'lucide-react';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, toggleLang } = useLanguage();

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
            {t('nav_find_jobs')}
          </Link>
          <Link href="/resume-builder" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('nav_resume')}
          </Link>
          <Link href="/my-applications" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('nav_my_apps')}
          </Link>

          {/* Language toggle */}
          <button
            aria-label="Switch language"
            onClick={toggleLang}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {t('nav_lang_toggle')}
          </button>

          <button
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <Link
            href="/drop-cv"
            className={cn(buttonVariants({ size: 'sm' }), 'border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-600/10 dark:text-brand-300 dark:hover:bg-brand-600/20 rounded-xl gap-1.5')}
          >
            <Inbox size={14} /> {t('nav_drop_cv')}
          </Link>
          <Link
            href="/hire-with-us"
            className={cn(buttonVariants({ size: 'sm' }), 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 rounded-xl gap-1.5')}
          >
            <Building2 size={14} /> Hire Talent
          </Link>
          <Link
            href="/#jobs"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-brand-600 hover:bg-brand-700 text-white rounded-xl')}
          >
            {t('nav_browse')}
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            aria-label="Switch language"
            onClick={toggleLang}
            className="rounded-lg border border-border px-2 py-1 text-xs font-semibold text-muted-foreground"
          >
            {t('nav_lang_toggle')}
          </button>
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
              {t('nav_find_jobs')}
            </Link>
            <Link href="/resume-builder" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {t('nav_resume')}
            </Link>
            <Link href="/my-applications" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {t('nav_my_apps')}
            </Link>
            <Link
              href="/drop-cv"
              onClick={() => setMenuOpen(false)}
              className="mt-1 flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 dark:border-brand-700/40 dark:bg-brand-600/10 dark:text-brand-300"
            >
              <Inbox size={15} /> {t('nav_drop_cv')}
            </Link>
            <Link
              href="/hire-with-us"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700 dark:border-amber-600/40 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <Building2 size={15} /> Hire Talent
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
