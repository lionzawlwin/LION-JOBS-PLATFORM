'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Menu, X, Inbox, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHasHydrated } from '@/hooks/useLocalStorageValue';

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mounted = useHasHydrated();
  const { t, toggleLang } = useLanguage();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isDark = mounted && theme === 'dark';

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b transition-all duration-300',
      scrolled
        ? 'border-border/80 bg-background/95 backdrop-blur-xl shadow-lg shadow-brand-600/5'
        : 'border-border/40 bg-background/80 backdrop-blur-md',
    )}>
      {/* Gold accent line — appears when scrolled */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-gold-500/70 to-transparent transition-opacity duration-500',
        scrolled ? 'opacity-100' : 'opacity-0',
      )} aria-hidden />

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Logo ── */}
        <Link href="/" className="group flex items-center gap-2.5 font-bold text-xl text-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/30 group-hover:shadow-brand-600/50 group-hover:scale-105 transition-all duration-200 text-base">
            🦁
          </div>
          <span>
            Lion{' '}
            <span className="bg-gradient-to-r from-brand-600 to-gold-500 bg-clip-text text-transparent">
              Jobs
            </span>
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center gap-5 md:flex">
          <Link href="/candidate#jobs" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hover:text-brand-600">
            {t('nav_find_jobs')}
          </Link>
          <Link href="/resume-builder" className="text-sm font-medium text-muted-foreground hover:text-brand-600 transition-colors">
            {t('nav_resume')}
          </Link>
          <Link href="/my-applications" className="text-sm font-medium text-muted-foreground hover:text-brand-600 transition-colors">
            {t('nav_my_apps')}
          </Link>

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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <Link
            href="/drop-cv"
            className={cn(buttonVariants({ size: 'sm' }), 'border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-700/40 dark:bg-brand-600/10 dark:text-brand-300 dark:hover:bg-brand-600/20 rounded-xl gap-1.5')}
          >
            <Inbox size={14} /> {t('nav_drop_cv')}
          </Link>
          <Link
            href="/company"
            className={cn(buttonVariants({ size: 'sm' }), 'border border-gold-300 bg-gold-50 text-gold-700 hover:bg-gold-100 dark:border-gold-600/40 dark:bg-gold-500/10 dark:text-gold-300 dark:hover:bg-gold-500/20 rounded-xl gap-1.5')}
          >
            <Building2 size={14} /> {t('nav_hire_talent')}
          </Link>
          <Link
            href="/candidate#jobs"
            className={cn(buttonVariants({ size: 'sm' }), 'bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-600/25 hover:shadow-brand-600/40 transition-shadow')}
          >
            {t('nav_browse')}
          </Link>
        </nav>

        {/* ── Mobile controls ── */}
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
          >
            {menuOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="border-t border-border bg-background/98 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-3">
            <Link href="/candidate#jobs" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {t('nav_find_jobs')}
            </Link>
            <Link href="/resume-builder" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {t('nav_resume')}
            </Link>
            <Link href="/my-applications" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
              {t('nav_my_apps')}
            </Link>
            <div className="mt-2 space-y-2 border-t border-border pt-2">
              <Link
                href="/drop-cv"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 dark:border-brand-700/40 dark:bg-brand-600/10 dark:text-brand-300"
              >
                <Inbox size={15} /> {t('nav_drop_cv')}
              </Link>
              <Link
                href="/company"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl border border-gold-300 bg-gold-50 px-3 py-2.5 text-sm font-semibold text-gold-700 dark:border-gold-600/40 dark:bg-gold-500/10 dark:text-gold-300"
              >
                <Building2 size={15} /> {t('nav_hire_talent')}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
