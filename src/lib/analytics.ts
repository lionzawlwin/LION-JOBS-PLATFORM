'use client';

// Thin client-safe wrapper around gtag. No-op if GA4 isn't configured
// (NEXT_PUBLIC_GA_MEASUREMENT_ID unset, so MarketingAnalytics.tsx never
// loaded the gtag script) or hasn't finished loading yet -- same
// "optional integration, unset = no-op" convention as every other
// integration in this repo. Never send PII in params (names, emails,
// phone numbers) -- only ids, counts, and non-identifying labels.
export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', name, params);
}
