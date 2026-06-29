'use client';

import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Search, ArrowRight, Briefcase, Users, Building2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JobCategory } from '@/types';

// ── Lazy-load: keeps the 3D bundle out of the critical path.
// ssr:false prevents R3F from running on the server (WebGL is browser-only).
const Hero3D = dynamic(() => import('@/components/Hero3D'), {
  ssr: false,
  loading: () => null,
});

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

const QUICK_CATEGORIES: { label: string; value: JobCategory | '' }[] = [
  { label: '✦ All Jobs', value: '' },
  { label: '💻 Engineering', value: 'Engineering' },
  { label: '🎨 Design', value: 'Design' },
  { label: '📢 Marketing', value: 'Marketing' },
  { label: '💰 Sales', value: 'Sales' },
  { label: '🏥 Healthcare', value: 'Healthcare' },
  { label: '🌐 Remote', value: 'Other' },
];

interface Props {
  onSearch: (keyword: string, category: JobCategory | '') => void;
}

export function HeroSection({ onSearch }: Props) {
  const { t } = useLanguage();
  const [keyword, setKeyword] = useState('');
  const [activeCategory, setActiveCategory] = useState<JobCategory | ''>('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch(keyword, activeCategory);
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleCategory(value: JobCategory | '') {
    setActiveCategory(value);
    onSearch(keyword, value);
    document.getElementById('jobs')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <section className="relative overflow-hidden myanmar-pattern-hero bg-background pt-14 pb-16 sm:pt-20 sm:pb-24">

      {/* ── 3D canvas — lazy, hidden on mobile to protect battery ── */}
      <div
        className="absolute inset-0 hidden md:block"
        aria-hidden
        style={{ zIndex: 0 }}
      >
        <Suspense fallback={null}>
          <Hero3D />
        </Suspense>
      </div>

      {/* ── Gradient colour orbs (behind text, above canvas) ─────── */}
      <div aria-hidden style={{ zIndex: 1 }} className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[900px] rounded-full bg-brand-600/6 blur-3xl" />
      <div aria-hidden style={{ zIndex: 1 }} className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-gold-500/8 blur-2xl" />
      <div aria-hidden style={{ zIndex: 1 }} className="pointer-events-none absolute bottom-0 left-0 h-60 w-60 rounded-full bg-brand-600/5 blur-2xl" />

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8" style={{ zIndex: 2 }}>

        {/* Badge */}
        <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp} className="mb-5 inline-flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-200 bg-gold-50 px-4 py-1.5 text-xs font-semibold text-gold-700 dark:border-gold-700/30 dark:bg-gold-600/10 dark:text-gold-400">
            🦁 {t('hero_badge')}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1} initial="hidden" animate="show" variants={fadeUp}
          className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          <span className="bg-gradient-to-r from-brand-600 via-gold-500 to-brand-500 bg-clip-text text-transparent">
            {t('hero_headline')}
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          custom={2} initial="hidden" animate="show" variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          {t('hero_sub')}
        </motion.p>

        {/* ── Search bar ─────────────────────────────────────────── */}
        <motion.form
          custom={3} initial="hidden" animate="show" variants={fadeUp}
          onSubmit={handleSubmit}
          className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border border-white/60 bg-white/80 dark:border-white/10 dark:bg-slate-950/60 p-2 shadow-xl shadow-brand-600/8 backdrop-blur-sm"
        >
          <Search size={18} className="ml-2 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('hero_search_placeholder')}
            className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/25"
          >
            {t('hero_search_btn')} <ArrowRight size={14} />
          </button>
        </motion.form>

        {/* ── Quick category chips ───────────────────────────────── */}
        <motion.div
          custom={4} initial="hidden" animate="show" variants={fadeUp}
          className="mt-4 flex flex-wrap justify-center gap-2"
        >
          {QUICK_CATEGORIES.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              onClick={() => handleCategory(value)}
              className={cn(
                'rounded-full px-4 py-1.5 text-xs font-medium transition-all',
                activeCategory === value
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                  : 'border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm text-muted-foreground hover:border-gold-500/40 hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Drop CV — prominent CTA card */}
        <motion.div
          custom={5} initial="hidden" animate="show" variants={fadeUp}
          className="mt-6"
        >
          <Link href="/drop-cv" className="group block mx-auto max-w-2xl">
            <div className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-brand-400/50 dark:border-brand-500/40 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm px-6 py-5 shadow-lg shadow-brand-600/8 transition-all duration-200 hover:border-brand-500 hover:bg-brand-50/80 dark:hover:bg-brand-600/10 hover:shadow-brand-600/15">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 group-hover:shadow-brand-600/50 group-hover:scale-105 transition-all duration-200">
                <Inbox size={22} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-bold text-foreground">Drop Your CV — No Job Required</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Join our talent pool. We'll match you when the perfect job arrives. Free &amp; no spam.</p>
              </div>
              <ArrowRight size={20} className="shrink-0 text-brand-600 group-hover:translate-x-1 transition-transform duration-200" />
            </div>
          </Link>
        </motion.div>

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
                <p className="text-base font-bold text-foreground">Looking to Hire? Tell Us Your Needs</p>
                <p className="mt-0.5 text-sm text-muted-foreground">Find pre-vetted talent for your company — free employer consultation, fast turnaround.</p>
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
