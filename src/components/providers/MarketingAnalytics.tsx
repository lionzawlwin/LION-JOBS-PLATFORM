import Script from 'next/script';

// Layer 21 (marketing analytics) -- optional integration, unset = no-op,
// matching this repo's existing convention for SENTRY_DSN and ALERT_EMAIL
// (see .env.example and /api/integrations-status). @vercel/analytics
// (already wired in layout.tsx) only gives pageviews; this adds real
// event-level tracking (job views, applications, portal logins) once a
// GA4 property exists and NEXT_PUBLIC_GA_MEASUREMENT_ID is set -- until
// then this renders nothing.
//
// Must be a NEXT_PUBLIC_ var (not a server-only secret): a GA4
// measurement ID is not sensitive, it's designed to be embedded in
// public page source, which is exactly what the gtag script below does.
export function MarketingAnalytics() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!measurementId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}
