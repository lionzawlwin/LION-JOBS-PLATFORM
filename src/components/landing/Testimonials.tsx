'use client';

import { Star } from 'lucide-react';
import { useTestimonials } from '@/hooks/useTestimonials';
import { useLanguage } from '@/contexts/LanguageContext';

function Stars({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={12} className="fill-gold-500 text-gold-500" />
      ))}
    </div>
  );
}

export function Testimonials() {
  const { testimonials, isLoading } = useTestimonials();
  const { t } = useLanguage();

  // Layer 18: no fabricated fallback content. If no candidate has yet
  // consented + been approved to have their feedback featured, the
  // section simply doesn't render rather than showing placeholder people.
  if (!isLoading && testimonials.length === 0) return null;

  return (
    <section className="border-t border-border bg-bg-subtle py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
            {t('home_testimonials_eyebrow')}
          </p>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t('home_testimonials_heading')}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('home_testimonials_sub')}
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Stars */}
              <Stars count={testimonial.rating} />

              {/* Quote */}
              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Attribution -- deliberately no name: this comes from the
                  anonymous interview feedback form, so a real name was
                  never collected in the first place. */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-700 text-xs font-bold text-white">
                  ★
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('home_testimonials_verified')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('home_testimonials_interviewed_at')} {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
