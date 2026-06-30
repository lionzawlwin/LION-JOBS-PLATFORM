'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat { label: string; value: number; suffix: string }

function buildStats(liveJobCount?: number): Stat[] {
  return [
    { label: 'Open Positions',        value: Math.max(liveJobCount ?? 0, 500), suffix: '+' },
    { label: 'Successful Placements', value: 200, suffix: '+' },
    { label: 'Partner Companies',     value: 50,  suffix: '+' },
    { label: 'Average Match Score',   value: 87,  suffix: '%' },
  ];
}

function useCountUp(target: number, duration = 1600, triggered: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!triggered) return;
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, duration, triggered]);
  return count;
}

function StatItem({ stat, triggered }: { stat: Stat; triggered: boolean }) {
  const count = useCountUp(stat.value, 1600, triggered);
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-3xl font-extrabold tracking-tight text-gradient-gold sm:text-4xl">
        {count}{stat.suffix}
      </span>
      <span className="text-xs font-medium uppercase tracking-widest text-white/50 sm:text-sm">
        {stat.label}
      </span>
    </div>
  );
}

export function StatsBar({ liveJobCount }: { liveJobCount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);
  const STATS = buildStats(liveJobCount);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTriggered(true); },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700 py-12">
      {/* Subtle Myanmar pattern at low opacity */}
      <div className="absolute inset-0 myanmar-pattern opacity-10" aria-hidden />
      {/* Inner glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" aria-hidden />

      <div className="relative mx-auto grid max-w-4xl grid-cols-2 gap-x-4 gap-y-8 px-4 sm:grid-cols-4 sm:divide-x sm:divide-white/10 sm:px-6">
        {STATS.map((s) => (
          <StatItem key={s.label} stat={s} triggered={triggered} />
        ))}
      </div>
    </div>
  );
}
