// Self-Serve Featured Job Listing Boost. Same invoice-tagging convention
// as companyRules.ts's featuredPlacementInvoicePosition(): the invoices
// table has a company_id column but no job_id column, so -- rather than a
// schema change for a third non-candidate-placement charge type -- the
// job id and duration are both encoded directly in Invoice.position and
// read back out when a boost invoice is marked Paid. Deliberately has
// zero Supabase/server-only imports, same reasoning as companyRules.ts.
const JOB_BOOST_POSITION_PREFIX = 'Job Boost — ';

export function jobBoostInvoicePosition(jobId: string, jobTitle: string, durationDays: number): string {
  return `${JOB_BOOST_POSITION_PREFIX}${jobTitle} [${jobId}] (${durationDays} days)`;
}
