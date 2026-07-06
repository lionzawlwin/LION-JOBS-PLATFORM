import Link from 'next/link';
import { Star, MapPin } from 'lucide-react';
import type { FeaturedCompany } from '@/lib/db';

// Matches companies/[slug]/page.tsx's local slugify exactly -- that page
// builds/matches slugs with this transform, not lib/utils.ts's slugify
// (different regex), so a link built any other way could 404.
function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function FeaturedEmployers({ companies }: { companies: FeaturedCompany[] }) {
  if (companies.length === 0) return null;

  return (
    <section className="border-b border-border bg-gold-50/40 py-8 dark:bg-gold-600/5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
          <Star size={15} className="text-gold-600" fill="currentColor" /> Featured Employers
        </h2>
        <div className="flex flex-wrap gap-3">
          {companies.map((co) => (
            <Link
              key={co.id}
              href={`/companies/${slugify(co.name)}`}
              className="flex items-center gap-3 rounded-2xl border border-gold-200 bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-gold-600/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
                {co.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{co.name}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {co.industry}{co.city && <> · <MapPin size={10} />{co.city}</>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
