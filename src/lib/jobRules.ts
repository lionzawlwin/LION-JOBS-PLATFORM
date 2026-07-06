// Self-Serve Featured Job Listing Boost. Same invoice-tagging convention
// as companyRules.ts's featuredPlacementInvoicePosition(): the invoices
// table has a company_id column but no job_id column, so -- rather than a
// schema change for a third non-candidate-placement charge type -- the
// job id and duration are both encoded directly in Invoice.position and
// read back out when a boost invoice is marked Paid. Deliberately has
// zero Supabase/server-only imports, same reasoning as companyRules.ts.
const JOB_BOOST_POSITION_PREFIX = 'Job Boost — ';
const JOB_BOOST_POSITION_PATTERN = /^Job Boost — .+ \[([^\]]+)\] \((\d+) days\)$/;

export function jobBoostInvoicePosition(jobId: string, jobTitle: string, durationDays: number): string {
  return `${JOB_BOOST_POSITION_PREFIX}${jobTitle} [${jobId}] (${durationDays} days)`;
}

// Returns the jobId and invoiced duration if `position` is a job-boost
// charge, or null otherwise -- doubles as the "is this a job-boost
// invoice" check, same pattern as parseFeaturedPlacementDurationDays().
export function parseJobBoost(position: string): { jobId: string; durationDays: number } | null {
  const match = JOB_BOOST_POSITION_PATTERN.exec(position);
  if (!match) return null;
  return { jobId: match[1], durationDays: Number(match[2]) };
}
