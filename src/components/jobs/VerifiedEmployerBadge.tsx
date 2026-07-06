import { ShieldCheck } from 'lucide-react';
import type { HealthBand } from '@/types';

// Layer 14 (Verified Employer Badge). v1 definition: "verified" means this
// employer's CSE relationship reads as healthy (green band -- recently
// contacted, has an active contract). Deliberately not yet gated on a fill-
// rate/response-time threshold as the roadmap originally proposed -- that
// needs application-level data these public pages don't otherwise load;
// revisit once real usage shows this simpler v1 is worth extending.
export function VerifiedEmployerBadge({ band }: { band: HealthBand | null }) {
  if (band !== 'green') return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
      <ShieldCheck size={12} /> Verified Employer
    </span>
  );
}
