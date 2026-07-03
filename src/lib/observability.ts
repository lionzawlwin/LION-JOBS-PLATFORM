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

  try {
    await appendSystemEvent({
      category: input.category,
      route:    input.route,
      message:  input.message,
      context:  input.context,
    });
  } catch (err) {
    // appendSystemEvent() already swallows Supabase-layer {error} responses
    // internally, but a network-level throw (not just a returned error) can
    // still escape it — catch that here too so "never throws" actually holds
    // for every caller, including unawaited fire-and-forget chains like
    // `somePromise.catch(logFailure)`, where an unhandled rejection here
    // would otherwise surface as a Node unhandledRejection.
    console.error('[observability] logFailure could not persist system_events row:', err);
  }
}

// Cron routes call this on every run, success or failure, so "last run
// time" is always answerable — see getCronStatus() in
// src/lib/db/systemEvents.ts.
export async function logCronSuccess(route: string, message: string): Promise<void> {
  try {
    await appendSystemEvent({ category: 'cron', level: 'info', route, message });
  } catch (err) {
    console.error('[observability] logCronSuccess could not persist system_events row:', err);
  }
}
