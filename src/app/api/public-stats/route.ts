import { NextResponse } from 'next/server';
import { getCompanies, getCandidates } from '@/lib/db';

// PUBLIC ROUTE: only returns two aggregate counts (companies/candidates by
// non-sensitive boolean flags) for the homepage StatsBar -- no PII, same
// public/no-auth posture as /api/testimonials' unscoped GET.
//
// Public, real homepage trust-signal numbers (Layer 18 follow-on) --
// StatsBar.tsx previously hardcoded "Successful Placements: 200" and
// "Partner Companies: 50" as fixed constants, the same fabricated-social-proof
// problem as the old Testimonials.tsx. This computes the real counts instead.
export async function GET() {
  const [companies, candidates] = await Promise.all([getCompanies(), getCandidates()]);

  const partnerCompanies = companies.filter((c) => !c.isInternal).length;
  const placements = candidates.filter((c) => c.stage === 'Hired').length;

  return NextResponse.json(
    { partnerCompanies, placements },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
  );
}
