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
