import * as Sentry from '@sentry/nextjs';

export function register() {
  // tracesSampleRate/tracesSampler deliberately omitted, not set to 0 —
  // per Sentry's own semantics, `0` still enables tracing instrumentation
  // (just samples nothing before send); leaving both undefined is the
  // actual no-op that keeps performance tracing genuinely out of scope.
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
  });
}

export const onRequestError = Sentry.captureRequestError;
