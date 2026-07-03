import * as Sentry from '@sentry/nextjs';
import { appendSystemEvent } from '@/lib/db';
import type { FailureCategory } from '@/types';

// The single call site every route uses instead of console.error for a
// handled-but-notable failure. Never throws — reporting a failure must
// never itself become a new failure for the caller. See
// docs/superpowers/specs/2026-07-03-phase-5-observability-design.md for
// the PII/secrets rule governing `context`.
export async function logFailure(input: {
  category: FailureCategory;
  route:    string;
  message:  string;
  error?:   unknown;
  context?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  try {
    Sentry.captureException(input.error ?? new Error(input.message), {
      tags:  { category: input.category, route: input.route },
      extra: input.context,
    });
  } catch {
    // Sentry itself failing to accept the event must not block the DB write below.
  }

  await appendSystemEvent({
    category: input.category,
    route:    input.route,
    message:  input.message,
    context:  input.context,
  });
}

// Cron routes call this on every run, success or failure, so "last run
// time" is always answerable — see getCronStatus() in
// src/lib/db/systemEvents.ts.
export async function logCronSuccess(route: string, message: string): Promise<void> {
  await appendSystemEvent({ category: 'cron', level: 'info', route, message });
}
