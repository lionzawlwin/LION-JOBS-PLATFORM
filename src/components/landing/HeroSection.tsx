'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Briefcase, Users, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { JobCategory } from '@/types';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
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
    <section className="relative overflow-hidden bg-background pt-14 pb-16 sm:pt-20 sm:pb-24">
      {/* Background orbs */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[700px] w-[900px] rounded-full bg-brand-600/8 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-0 right-0 h-80 w-80 rounded-full bg-brand-500/5 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 h-60 w-60 rounded-full bg-brand-600/5 blur-2xl" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">

        {/* Badge */}
        <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp} className="mb-5 inline-flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-400">
            🦁 Myanmar&apos;s #1 Job Agency
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1} initial="hidden" animate="show" variants={fadeUp}
          className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Find Your Dream Job{' '}
          <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
            in Myanmar
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          custom={2} initial="hidden" animate="show" variants={fadeUp}
          className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          Browse hundreds of vetted positions. Apply in minutes. Our expert team matches you with roles that fit your skills and salary expectations.
        </motion.p>

        {/* ── Hero Search Bar ── */}
        <motion.form
          custom={3} initial="hidden" animate="show" variants={fadeUp}
          onSubmit={handleSubmit}
          className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg shadow-brand-600/5"
        >
          <Search size={18} className="ml-2 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Job title, company, or keyword…"
            className="flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Search <ArrowRight size={14} />
          </button>
        </motion.form>

        {/* ── Quick Category Chips ── */}
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
                  : 'border border-border bg-background text-muted-foreground hover:border-brand-500/40 hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Trust strip */}
        <motion.div
          custom={5} initial="hidden" animate="show" variants={fadeUp}
          className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1.5"><Briefcase size={13} className="text-brand-600" /> 500+ open roles</span>
          <span className="flex items-center gap-1.5"><Building2 size={13} className="text-brand-600" /> 50+ partner companies</span>
          <span className="flex items-center gap-1.5"><Users size={13} className="text-brand-600" /> Free for candidates</span>
        </motion.div>
      </div>
    </section>
  );
}
