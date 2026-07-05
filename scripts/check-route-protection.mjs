#!/usr/bin/env node
// CI guard: every src/app/api/**/route.ts must either call a recognised
// auth/rate-limit guard, or carry an explicit `PUBLIC ROUTE:` comment
// explaining why it doesn't need one. This does not change any runtime
// behaviour -- it only fails the build if a *new* route is added with
// neither, so an accidentally-unguarded route gets caught in CI instead
// of discovered later (see the Phase 4 RBAC and Phase 20 API-hardening
// history this is meant to keep future routes consistent with).
//
// Recognised guards (any one is sufficient):
//   requireTabAccess, requireStaff, requireRole   -- dashboard staff RBAC
//   getPortalSubjectId, consumeLoginToken         -- Company/Candidate Portal session auth
//   checkRateLimit                                -- public-but-rate-limited write endpoints
//   secureCompare, CRON_SECRET, PUBLISH_WEBHOOK_SECRET -- shared-secret header auth (crons, webhooks)
//   `PUBLIC ROUTE:` comment                        -- explicit, reviewed exemption

import { readFileSync, globSync } from 'node:fs';

const GUARD_PATTERN = /requireTabAccess|requireStaff|requireRole|getPortalSubjectId|consumeLoginToken|checkRateLimit|secureCompare|CRON_SECRET|PUBLISH_WEBHOOK_SECRET|PUBLIC ROUTE:/;

const files = globSync('src/app/api/**/route.ts').sort();
const unguarded = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  if (!GUARD_PATTERN.test(content)) {
    unguarded.push(file);
  }
}

if (unguarded.length > 0) {
  console.error('\nRoute-protection check FAILED. The following API routes have no recognised auth/rate-limit guard and no `PUBLIC ROUTE:` comment explaining why:\n');
  for (const file of unguarded) console.error(`  - ${file}`);
  console.error('\nEither add the appropriate guard (requireTabAccess/requireStaff/requireRole for staff routes, checkRateLimit for public write endpoints, etc.), or add a `// PUBLIC ROUTE: <reason>` comment near the top of the file if this route is intentionally open.\n');
  process.exit(1);
}

console.log(`Route-protection check passed (${files.length} routes scanned).`);
