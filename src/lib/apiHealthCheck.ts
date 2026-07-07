import { recordApiHealthCheck } from '@/lib/db';
import { logFailure } from '@/lib/observability';

const SITE_URL = process.env.SITE_URL ?? 'https://lion-jobs-platform.vercel.app';
const ROUTE = '/api/cron/job-alerts#api-health-check';

// Representative routes for the synthetic ping, per the design decision in
// docs/superpowers/specs/2026-07-07-cto-big-upgrades-portfolio.md ("Item #4
// in more detail"): a public data route, the auth-gated dashboard entry
// point, and a staff-only API route -- enough spread to catch a routing/
// auth-layer regression without pinging the whole app surface.
const ROUTES_TO_PING = ['/api/jobs', '/dashboard', '/api/system-events'];

// Called once at the start of the daily job-alerts cron, alongside
// runHealthCheck() (cron-silence/failure-spike alerting) and
// runCrmDigest() -- this project is capped at Vercel Hobby's 2 cron jobs,
// so this piggybacks rather than adding a 3rd (same trick runHealthCheck()
// already established). Never throws -- a health-check failure must not
// break the cron it's riding on.
export async function runApiHealthCheck(): Promise<void> {
  await Promise.all(ROUTES_TO_PING.map(pingRoute));
}

async function pingRoute(path: string): Promise<void> {
  const start = Date.now();
  try {
    // redirect: 'manual' -- /dashboard is expected to 3xx to the sign-in
    // page for an unauthenticated ping; following that chain would measure
    // NextAuth's sign-in page render too, not just this route's own
    // latency. cache: 'no-store' -- a cached response would measure
    // nothing useful for an uptime/latency check.
    const res = await fetch(`${SITE_URL}${path}`, {
      method:   'GET',
      redirect: 'manual',
      cache:    'no-store',
    });
    const latencyMs = Date.now() - start;
    // A synthetic ping is unauthenticated by design -- /dashboard
    // responding with a redirect to sign-in (3xx) and /api/system-events
    // responding with 401 Unauthorized are both healthy outcomes (the
    // route is up and correctly enforcing its own auth), not failures.
    // Only a network-level throw or a 5xx server error counts as 'fail'.
    const status = res.status < 500 ? 'ok' : 'fail';
    await recordApiHealthCheck({ route: path, latencyMs, status });
  } catch (err) {
    const latencyMs = Date.now() - start;
    await recordApiHealthCheck({ route: path, latencyMs, status: 'fail' });
    await logFailure({
      category: 'cron',
      route:    `${ROUTE}:${path}`,
      message:  'Synthetic API health check request failed',
      error:    err,
    });
  }
}
