'use client';

import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    name:     'Mg Kyaw Zin Thu',
    role:     'Software Engineer',
    company:  'City Bank Myanmar',
    avatar:   'KZ',
    bg:       'from-brand-600 to-brand-700',
    quote:    'Lion Jobs matched me with my dream role in just 2 weeks. The team understood exactly what I was looking for and prepared me well for interviews.',
    stars:    5,
  },
  {
    name:     'Ma Aye Thandar',
    role:     'Digital Marketing Manager',
    company:  'KBZ Bank',
    avatar:   'AT',
    bg:       'from-gold-500 to-gold-600',
    quote:    'I was transitioning careers and Lion Jobs made it seamless. I received 3 interview invitations in my very first week on the platform.',
    stars:    5,
  },
  {
    name:     'Ko Win Myat Aung',
    role:     'Operations Lead',
    company:  'Myanmar Brewery Ltd.',
    avatar:   'WM',
    bg:       'from-green-600 to-green-700',
    quote:    'Thanks to Lion Jobs, I am now earning 40% more than my previous role. The salary negotiation support alone was worth everything.',
    stars:    5,
  },
] as const;

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
  return (
    <section className="border-t border-border bg-bg-subtle py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-600">
            Success Stories
          </p>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Candidates Who Found Their Dream Job
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Real people. Real placements. Zero agency fee for candidates.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Stars */}
              <Stars count={t.stars} />

              {/* Quote */}
              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.bg} text-xs font-bold text-white`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.role} · {t.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Join 200+ candidates who found their dream role through Lion Jobs Agency — completely free.
        </p>
      </div>
    </section>
  );
}
