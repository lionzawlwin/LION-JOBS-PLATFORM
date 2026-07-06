import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { requireStaff, getSessionScope } from '@/lib/auth';
import { hasAccess } from '@/lib/permissions';
import { getCandidates, getCompanies, getContracts, getJobs, getB2bLeads, listAllJobRequests } from '@/lib/db';
import { filterCompaniesForCse } from '@/lib/cseScope';
import { buildSearchResults } from '@/lib/search';
import type { Candidate, Company, Job, B2bLead, JobRequest, StaffRole } from '@/types';

export async function GET(req: NextRequest) {
  if (!(await requireStaff())) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (q.trim().length < 2) {
    return Response.json({ results: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const session = await getServerSession(authOptions);
  const role = session?.user?.role as StaffRole;

  const [canCandidates, canCompanies, canManageJobs, canB2bLeads] = await Promise.all([
    hasAccess(role, 'candidates', 'view'),
    hasAccess(role, 'companies', 'view'),
    hasAccess(role, 'manage-jobs', 'view'),
    hasAccess(role, 'b2b-leads', 'view'),
  ]);

  const [candidates, companiesRaw, jobs, leads, jobRequests]: [Candidate[], Company[], Job[], B2bLead[], JobRequest[]] =
    await Promise.all([
      canCandidates ? getCandidates() : Promise.resolve([]),
      canCompanies ? getCompanies() : Promise.resolve([]),
      canManageJobs ? getJobs() : Promise.resolve([]),
      canB2bLeads ? getB2bLeads() : Promise.resolve([]),
      canManageJobs ? listAllJobRequests() : Promise.resolve([]),
    ]);

  // Layer 24 (AppSec review): /api/companies row-scopes to a CSE's own
  // book (filterCompaniesForCse), but this search endpoint returned every
  // company's name+email to a cse-role session regardless -- the command
  // palette was a back door around the exact restriction the Companies
  // tab enforces.
  const scope = await getSessionScope();
  const companies = scope?.role === 'cse'
    ? filterCompaniesForCse(companiesRaw, await getContracts(), scope.cseRepId)
    : companiesRaw;

  const results = buildSearchResults(q, { candidates, companies, jobs, leads, jobRequests });

  return Response.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
}
