'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[600px] w-[800px] rounded-full bg-brand-600/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-10 right-0 h-72 w-72 rounded-full bg-brand-500/5 blur-2xl"
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        {/* Badge */}
        <motion.div custom={0} initial="hidden" animate="show" variants={fadeUp} className="mb-6 inline-flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50 px-4 py-1.5 text-xs font-medium text-brand-700 dark:border-brand-700/30 dark:bg-brand-600/10 dark:text-brand-400">
            <Sparkles size={12} />
            AI-Powered Job Matching
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          custom={1}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
        >
          Find Your Dream Career{' '}
          <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
            in Myanmar
          </span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          custom={2}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
        >
          Lion Jobs Agency connects top talent with leading companies. Curated positions,
          AI-scored matches, and a seamless application experience.
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            href="#jobs"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/25 transition-all hover:shadow-brand-600/40',
            )}
          >
            Browse Open Roles <ArrowRight size={16} className="ml-1.5" />
          </Link>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}
          >
            Client Portal
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.p
          custom={4}
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mt-6 text-xs text-muted-foreground"
        >
          Trusted by 50+ companies · Free for candidates · No hidden fees
        </motion.p>
      </div>
    </section>
  );
}
