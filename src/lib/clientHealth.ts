import type { CompanyStatus, HealthBand } from '@/types';

// Layer 11 (Client Health Score) v1 heuristic. Pure and side-effect free so
// it can run both server-side (aggregate KPI, see src/lib/db/clientHealth.ts)
// and client-side (per-row badge in EnterpriseAccountRow, reusing contract/
// interaction data that component already has -- no extra fetch needed).
// Thresholds are a deliberate v1 starting point, not a tuned model; revisit
// once real usage shows whether 14/30 days over- or under-fires.
export function computeHealthBand(input: {
  status: CompanyStatus;
  lastContactedAt: string | null;
  hasActiveContract: boolean;
}): HealthBand | null {
  if (input.status !== 'Active' && input.status !== 'In-Contract') return null;

  if (!input.lastContactedAt) return 'red';

  const daysSince = Math.floor(
    (Date.now() - new Date(input.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSince > 30 || !input.hasActiveContract) return 'red';
  if (daysSince > 14) return 'yellow';
  return 'green';
}

export function daysSince(dateIso: string | null): number | null {
  if (!dateIso) return null;
  return Math.floor((Date.now() - new Date(dateIso).getTime()) / (1000 * 60 * 60 * 24));
}
