import { requireTabAccess, getSessionScope } from '@/lib/auth';
import { getCseReps, getContracts, getB2bLeads } from '@/lib/db';
import { computeCsePerformance } from '@/lib/csePerformance';

// Row-scoped like Phase 10's companies/contracts/interactions scoping: a
// `cse`-role caller sees only their own performance row, not their peers'.
export async function GET() {
  if (!(await requireTabAccess('enterprise', 'view'))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scope = await getSessionScope();
  const [cseReps, contracts, leads] = await Promise.all([getCseReps(), getContracts(), getB2bLeads()]);

  let rows = computeCsePerformance({ cseReps, contracts, leads });
  if (scope?.role === 'cse') {
    rows = rows.filter((r) => r.cseRepId === scope.cseRepId);
  }

  return Response.json({ rows }, { headers: { 'Cache-Control': 'no-store' } });
}
