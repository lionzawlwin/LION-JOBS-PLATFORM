'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat { label: string; value: number; suffix: string }

const STATS: Stat[] = [
  { label: 'Open Positions', value: 500, suffix: '+' },
  { label: 'Successful Placements', value: 200, suffix: '+' },
  { label: 'Partner Companies', value: 50, suffix: '+' },
  { label: 'Average Match Score', value: 87, suffix: '%' },
];

function useCountUp(target: number, duration = 1400, triggered: boolean) {
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
  const count = useCountUp(stat.value, 1400, triggered);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl font-bold text-foreground sm:text-3xl">
        {count}{stat.suffix}
      </span>
      <span className="text-xs text-muted-foreground sm:text-sm">{stat.label}</span>
    </div>
  );
}

export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTriggered(true); },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="border-y border-border bg-bg-subtle py-8">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
        {STATS.map((s) => (
          <StatItem key={s.label} stat={s} triggered={triggered} />
        ))}
      </div>
    </div>
  );
}
